package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.records.ShippingOptionDTO;
import com.rodrigo.demo.entities.records.ShippingQuoteRequestDTO;
import com.rodrigo.demo.entities.records.ShippingQuoteResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ShippingQuoteService {

    @Value("${shipping.quote.origin-zip-code:39730-000}")
    private String originZipCode;

    @Value("${shipping.quote.services:1,2,17,18}")
    private String services;

    @Value("${melhorenvio.base-url:https://sandbox.melhorenvio.com.br}")
    private String melhorEnvioBaseUrl;

    @Value("${melhorenvio.user-agent:Nexus Store (suporte@nexusstore.local)}")
    private String melhorEnvioUserAgent;

    @Value("${shipping.geo.base-url:https://nominatim.openstreetmap.org/search}")
    private String geocodingBaseUrl;

    private final RestTemplate restTemplate;
    private final MelhorEnvioAuthService melhorEnvioAuthService;
    private final Map<String, GeoPoint> geoCache;
    private final Set<String> geoMissCache;

    public ShippingQuoteService(MelhorEnvioAuthService melhorEnvioAuthService) {
        this.melhorEnvioAuthService = melhorEnvioAuthService;
        this.restTemplate = new RestTemplate();
        this.geoCache = new ConcurrentHashMap<>();
        this.geoMissCache = ConcurrentHashMap.newKeySet();
    }

    public ShippingQuoteResponseDTO quote(ShippingQuoteRequestDTO request) {
        String zipCode = normalizeDigits(request.zipCode());
        if (zipCode.length() != 8) {
            throw new IllegalStateException("CEP inválido para cotação de frete.");
        }

        double orderTotal = request.orderTotal() == null ? 0.0 : Math.max(0.0, request.orderTotal());
        int itemCount = request.itemCount() == null ? 1 : Math.max(1, request.itemCount());

        List<ShippingOptionDTO> melhorEnvioOptions = fetchMelhorEnvioQuotes(zipCode, orderTotal, itemCount);
        if (!melhorEnvioOptions.isEmpty()) {
            return new ShippingQuoteResponseDTO("api", melhorEnvioOptions);
        }

        return new ShippingQuoteResponseDTO("simulado", buildCorreiosOptions(zipCode, orderTotal, itemCount));
    }

    @SuppressWarnings("unchecked")
    private List<ShippingOptionDTO> fetchMelhorEnvioQuotes(String zipCode, double orderTotal, int itemCount) {
        String accessToken = melhorEnvioAuthService.getValidAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            return List.of();
        }

        try {
            return executeMelhorEnvioQuote(zipCode, orderTotal, itemCount, accessToken);
        } catch (HttpClientErrorException.Unauthorized unauthorized) {
            String refreshedToken = melhorEnvioAuthService.refreshAccessToken();
            if (refreshedToken == null || refreshedToken.isBlank()) {
                return List.of();
            }
            try {
                return executeMelhorEnvioQuote(zipCode, orderTotal, itemCount, refreshedToken);
            } catch (Exception retryError) {
                return List.of();
            }
        } catch (Exception ex) {
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<ShippingOptionDTO> executeMelhorEnvioQuote(String zipCode, double orderTotal, int itemCount, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(accessToken);
        headers.set("User-Agent", melhorEnvioUserAgent);

        String originZipDigits = normalizeDigits(originZipCode);
        if (originZipDigits.length() != 8) {
            return List.of();
        }

        Map<String, Object> product = new LinkedHashMap<>();
        product.put("id", "cart");
        product.put("width", 16);
        product.put("height", Math.max(4, Math.min(30, 2 + itemCount * 2)));
        product.put("length", 22);
        product.put("weight", roundWeight(Math.max(0.3, itemCount * 0.2)));
        product.put("insurance_value", roundPrice(Math.max(1.0, (orderTotal <= 0.0 ? 20.0 : orderTotal) / itemCount)));
        product.put("quantity", itemCount);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("from", Map.of("postal_code", originZipDigits));
        payload.put("to", Map.of("postal_code", zipCode));
        payload.put("products", List.of(product));
        payload.put("options", Map.of("receipt", false, "own_hand", false));
        if (services != null && !services.isBlank()) {
            payload.put("services", services);
        }

        String url = normalizeBaseUrl(melhorEnvioBaseUrl) + "/api/v2/me/shipment/calculate";
        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(payload, headers);
        ResponseEntity<List> response = restTemplate.exchange(url, HttpMethod.POST, requestEntity, List.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            return List.of();
        }

        return normalizeExternalOptions(response.getBody());
    }

    private List<ShippingOptionDTO> normalizeExternalOptions(List<?> rawOptions) {
        List<ShippingOptionDTO> normalized = new ArrayList<>();

        for (int i = 0; i < rawOptions.size(); i++) {
            Object raw = rawOptions.get(i);
            if (!(raw instanceof Map<?, ?> map)) {
                continue;
            }

            if (readString(map, "error") != null) {
                continue;
            }

            Double price = readDouble(map, "custom_price", "price", "cost", "value", "amount");
            Integer minDays = readInteger(map, "custom_delivery_time", "delivery_time", "minDays", "deadlineMin", "deliveryMin", "deliveryDays");
            Integer maxDays = readInteger(map, "custom_delivery_time", "delivery_time", "maxDays", "deadlineMax", "deliveryMax", "deliveryDays");
            if (price == null || minDays == null || maxDays == null) {
                continue;
            }

            int minSafe = Math.max(1, minDays);
            int maxSafe = Math.max(minSafe, maxDays);

            String carrier = readNestedString(map, "company", "name");
            if (carrier == null || carrier.isBlank()) {
                carrier = readString(map, "carrier", "provider");
            }
            if (carrier == null || carrier.isBlank()) {
                carrier = "Correios";
            }

            String service = readString(map, "name", "service", "serviceName");
            if (service == null || service.isBlank()) {
                service = "Serviço";
            }

            String id = readString(map, "id", "serviceCode", "code");
            if (id == null || id.isBlank()) {
                id = "option-" + (i + 1);
            }

            String label = readString(map, "label");
            if (label == null || label.isBlank()) {
                label = (carrier + " " + service).trim();
            }

            normalized.add(new ShippingOptionDTO(
                    id,
                    carrier,
                    service,
                    label,
                    roundPrice(price),
                    minSafe,
                    maxSafe
            ));
        }

        return normalized;
    }

    private List<ShippingOptionDTO> buildCorreiosOptions(String zipCode, double orderTotal, int itemCount) {
        double distanceKm = getDistanceInKm(originZipCode, zipCode);
        double weightFactor = 1 + Math.max(0, itemCount - 1) * 0.08;
        double distanceBase = 9.5 + (distanceKm * 0.022);
        double baseCost = Math.max(13.5, (distanceBase + itemCount * 1.45) * weightFactor);

        int baseDays = distanceKm <= 100
            ? 2
            : distanceKm <= 300
            ? 3
            : distanceKm <= 600
            ? 4
            : distanceKm <= 1000
            ? 6
            : distanceKm <= 1600
            ? 8
            : 10;

        boolean freePac = orderTotal >= 349.0;

        int pacMin = baseDays + 1;
        int pacMax = baseDays + 3;

        int sedexMin = Math.max(1, baseDays - 2);
        int sedexMax = Math.max(sedexMin, baseDays);

        ShippingOptionDTO pac = new ShippingOptionDTO(
                "correios-pac",
                "Correios",
                "PAC",
                freePac ? "Correios PAC (frete grátis)" : "Correios PAC",
                freePac ? 0.0 : roundPrice(Math.max(14.9, baseCost)),
                pacMin,
                pacMax
        );

        ShippingOptionDTO sedex = new ShippingOptionDTO(
                "correios-sedex",
                "Correios",
                "SEDEX",
                "Correios SEDEX",
                roundPrice(Math.max(24.9, baseCost * 1.72 + 2)),
                sedexMin,
                sedexMax
        );

        return List.of(pac, sedex);
    }

    private double getDistanceInKm(String originZip, String destinationZip) {
        String originDigits = normalizeDigits(originZip);
        String destinationDigits = normalizeDigits(destinationZip);

        if (originDigits.length() != 8 || destinationDigits.length() != 8) {
            return 450.0;
        }

        if (originDigits.equals(destinationDigits)) {
            return 10.0;
        }

        GeoPoint origin = resolveCoordinates(originDigits);
        GeoPoint destination = resolveCoordinates(destinationDigits);

        if (origin == null || destination == null) {
            return fallbackDistanceEstimate(originDigits, destinationDigits);
        }

        return haversineKm(origin.latitude(), origin.longitude(), destination.latitude(), destination.longitude());
    }

    @SuppressWarnings("unchecked")
    private GeoPoint resolveCoordinates(String zipDigits) {
        if (geoCache.containsKey(zipDigits)) {
            return geoCache.get(zipDigits);
        }
        if (geoMissCache.contains(zipDigits)) {
            return null;
        }

        try {
            String query = zipDigits.substring(0, 5) + "-" + zipDigits.substring(5) + ", Brasil";
            String url = UriComponentsBuilder
                    .fromUriString(geocodingBaseUrl)
                    .queryParam("q", query)
                    .queryParam("format", "json")
                    .queryParam("limit", "1")
                    .queryParam("addressdetails", "0")
                    .build(true)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "workshop-springboot-shipping/1.0");
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<List> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    List.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isEmpty()) {
                geoMissCache.add(zipDigits);
                return null;
            }

            Object raw = response.getBody().get(0);
            if (!(raw instanceof Map<?, ?> map)) {
                geoMissCache.add(zipDigits);
                return null;
            }

            Double lat = readDouble(map, "lat", "latitude");
            Double lon = readDouble(map, "lon", "lng", "longitude");
            if (lat == null || lon == null) {
                geoMissCache.add(zipDigits);
                return null;
            }

            GeoPoint point = new GeoPoint(lat, lon);
            geoCache.put(zipDigits, point);
            geoMissCache.remove(zipDigits);
            return point;
        } catch (Exception ex) {
            geoMissCache.add(zipDigits);
            return null;
        }
    }

    private double fallbackDistanceEstimate(String originDigits, String destinationDigits) {
        int originFirst = Character.getNumericValue(originDigits.charAt(0));
        int destinationFirst = Character.getNumericValue(destinationDigits.charAt(0));
        int diff = Math.abs(originFirst - destinationFirst);

        if (diff == 0) {
            return 120.0;
        }
        if (diff == 1) {
            return 350.0;
        }
        if (diff == 2) {
            return 650.0;
        }
        if (diff == 3) {
            return 900.0;
        }
        return 1300.0;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusKm = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.max(1.0, earthRadiusKm * c);
    }

    private Double readDouble(Map<?, ?> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value instanceof Number number) {
                return number.doubleValue();
            }
            if (value instanceof String text) {
                try {
                    return Double.parseDouble(text.trim().replace(",", "."));
                } catch (NumberFormatException ignored) {
                    // tenta próxima chave
                }
            }
        }
        return null;
    }

    private Integer readInteger(Map<?, ?> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value instanceof Number number) {
                return number.intValue();
            }
            if (value instanceof String text) {
                try {
                    return Integer.parseInt(text);
                } catch (NumberFormatException ignored) {
                    // tenta próxima chave
                }
            }
        }
        return null;
    }

    private String readString(Map<?, ?> source, String... keys) {
        for (String key : keys) {
            Object value = source.get(key);
            if (value != null) {
                String text = value.toString().trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    private String readNestedString(Map<?, ?> source, String parentKey, String childKey) {
        Object parent = source.get(parentKey);
        if (parent instanceof Map<?, ?> parentMap) {
            Object value = parentMap.get(childKey);
            if (value != null) {
                String text = value.toString().trim();
                if (!text.isBlank()) {
                    return text;
                }
            }
        }
        return null;
    }

    private double roundPrice(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double roundWeight(double value) {
        return Math.round(value * 1000.0) / 1000.0;
    }

    private String normalizeBaseUrl(String value) {
        if (value == null) {
            return "";
        }
        String safe = value.trim();
        while (safe.endsWith("/")) {
            safe = safe.substring(0, safe.length() - 1);
        }
        return safe;
    }

    private String normalizeDigits(String input) {
        if (input == null) {
            return "";
        }
        return input.replaceAll("\\D", "");
    }

    private record GeoPoint(double latitude, double longitude) {
    }
}

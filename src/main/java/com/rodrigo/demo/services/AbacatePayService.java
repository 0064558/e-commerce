package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.OrderItem;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.entities.records.AbacatePayCheckoutDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AbacatePayService {

    private final RestTemplate restTemplate;
    @Value("${abacatepay.base-url:https://api.abacatepay.com/v1}")
    private String baseUrl;

    @Value("${abacatepay.api-key:}")
    private String apiKey;

    @Value("${abacatepay.return-url:http://localhost:3000/checkout}")
    private String returnUrl;

    @Value("${abacatepay.completion-url:http://localhost:3000/success}")
    private String completionUrl;

    public AbacatePayService() {
        this.restTemplate = new RestTemplate();
    }

    public AbacatePayCheckoutDTO createBilling(Order order) {
        return createBilling(order, 0.0, null);
    }

    public AbacatePayCheckoutDTO createBilling(Order order, Double shippingAmount, String shippingLabel) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("AbacatePay API key nao configurada.");
        }

        User customerUser = order.getClient();
        String taxId = normalizeTaxId(customerUser.getTaxId());
        if (taxId.isBlank()) {
            throw new IllegalStateException("CPF obrigatorio para pagamento.");
        }

        String returnWithExternal = appendQueryParam(returnUrl, "externalId", order.getExternalId());
        String completionWithExternal = appendQueryParam(completionUrl, "externalId", order.getExternalId());

        double shippingAmountSafe = shippingAmount == null ? 0.0 : Math.max(0.0, shippingAmount);
        String shippingLabelSafe = (shippingLabel == null || shippingLabel.isBlank()) ? "Frete" : shippingLabel.trim();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("frequency", "ONE_TIME");
        payload.put("methods", List.of("PIX", "CARD"));
        payload.put("products", buildProducts(order, shippingAmountSafe, shippingLabelSafe));
        payload.put("returnUrl", returnWithExternal);
        payload.put("completionUrl", completionWithExternal);
        payload.put("allowCoupons", false);
        payload.put("externalId", order.getExternalId());
        Map<String, String> metadata = new LinkedHashMap<>();
        if (order.getId() != null) {
            metadata.put("orderId", String.valueOf(order.getId()));
        }
        if (order.getExternalId() != null && !order.getExternalId().isBlank()) {
            metadata.put("externalId", order.getExternalId());
        }
        payload.put("metadata", metadata);
        Map<String, Object> customer = new LinkedHashMap<>();
        customer.put("name", customerUser.getName());
        customer.put("email", customerUser.getEmail());
        customer.put("taxId", taxId);
        if (customerUser.getPhone() != null && !customerUser.getPhone().isBlank()) {
            customer.put("cellphone", normalizeDigits(customerUser.getPhone()));
        }
        payload.put("customer", customer);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.setBearerAuth(apiKey);
        headers.set("X-API-KEY", apiKey);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
        ResponseEntity<String> response;
        try {
            response = postBillingRequest(request);
        } catch (HttpStatusCodeException ex) {
            String details = extractAbacateError(ex.getResponseBodyAsString());
            boolean metadataRejected = ex.getStatusCode().value() == 422
                    && details.toLowerCase().contains("metadata")
                    && payload.containsKey("metadata");

            if (metadataRejected) {
                payload.remove("metadata");
                try {
                    response = postBillingRequest(new HttpEntity<>(payload, headers));
                } catch (HttpStatusCodeException retryEx) {
                    String retryDetails = extractAbacateError(retryEx.getResponseBodyAsString());
                    throw new IllegalStateException("Falha ao criar cobranca no AbacatePay: " + retryDetails);
                } catch (RestClientException retryEx) {
                    throw new IllegalStateException("Falha ao comunicar com AbacatePay.");
                }
            } else {
                throw new IllegalStateException("Falha ao criar cobranca no AbacatePay: " + details);
            }
        } catch (RestClientException ex) {
            throw new IllegalStateException("Falha ao comunicar com AbacatePay.");
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Falha ao criar cobranca no AbacatePay.");
        }

        String body = response.getBody();
        String checkoutUrl = extractCheckoutUrl(body);
        String billingId = extractBillingId(body);
        return new AbacatePayCheckoutDTO(billingId, checkoutUrl);
    }

    private List<Map<String, Object>> buildProducts(Order order, double shippingAmount, String shippingLabel) {
        List<Map<String, Object>> products = new ArrayList<>();
        int index = 0;
        for (OrderItem item : order.getItems()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("externalId", buildItemExternalId(order, item, index));
            entry.put("name", item.getProduct().getName());
            entry.put("description", item.getProduct().getDescription() == null ? "" : item.getProduct().getDescription());
            entry.put("quantity", item.getQuantity());
            entry.put("price", resolveItemPriceInCents(item));
            products.add(entry);
            index += 1;
        }

        if (shippingAmount > 0.0) {
            Map<String, Object> shippingEntry = new LinkedHashMap<>();
            shippingEntry.put("externalId", buildShippingExternalId(order, shippingAmount));
            shippingEntry.put("name", shippingLabel);
            shippingEntry.put("description", "Frete do pedido");
            shippingEntry.put("quantity", 1);
            shippingEntry.put("price", Math.round(shippingAmount * 100));
            products.add(shippingEntry);
        }

        return products;
    }

    private long resolveItemPriceInCents(OrderItem item) {
        double snapshotPrice = item.getPrice() == null ? 0.0 : item.getPrice();
        if (snapshotPrice <= 0.0 && item.getProduct() != null && item.getProduct().getPrice() != null) {
            snapshotPrice = item.getProduct().getPrice();
        }
        return Math.round(Math.max(0.0, snapshotPrice) * 100);
    }

    private String buildItemExternalId(Order order, OrderItem item, int index) {
        String orderExternalId = order.getExternalId() == null ? String.valueOf(order.getId()) : order.getExternalId();
        Long productId = item.getProduct() == null ? null : item.getProduct().getId();
        String productPart = productId == null ? "unknown" : String.valueOf(productId);
        return "order-" + orderExternalId + "-product-" + productPart + "-idx-" + index;
    }

    private String buildShippingExternalId(Order order, double shippingAmount) {
        String orderExternalId = order.getExternalId() == null ? String.valueOf(order.getId()) : order.getExternalId();
        long shippingCents = Math.round(Math.max(0.0, shippingAmount) * 100);
        return "order-" + orderExternalId + "-shipping-" + shippingCents;
    }

    private String extractCheckoutUrl(String body) {
        if (body == null || body.isBlank()) {
            throw new IllegalStateException("Resposta vazia do AbacatePay.");
        }

        String urlFromJson = extractCheckoutUrlFromJson(body);
        if (hasText(urlFromJson)) {
            return urlFromJson;
        }

        Matcher matcher = Pattern.compile("\\\"(checkoutUrl|url)\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"")
                .matcher(body);
        String fallback = null;
        while (matcher.find()) {
            String candidate = matcher.group(2);
            if (hasText(candidate) && (candidate.contains("abacate") || candidate.contains("checkout"))) {
                return candidate;
            }
            if (hasText(candidate)) {
                fallback = candidate;
            }
        }
        if (hasText(fallback)) {
            return fallback;
        }

        throw new IllegalStateException("AbacatePay nao retornou URL de checkout.");
    }

    private String extractBillingId(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }

        String idFromJson = extractBillingIdFromJson(body);
        if (hasText(idFromJson)) {
            return idFromJson;
        }

        Matcher matcher = Pattern.compile("\\\"id\\\"\\s*:\\s*\\\"(bill_[^\\\"]+)\\\"")
                .matcher(body);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    private String extractAbacateError(String body) {
        if (!hasText(body)) {
            return "resposta vazia da API.";
        }

        try {
            Map<?, ?> root = new ObjectMapper().readValue(body, Map.class);

            String error = getString(root, "error");
            if (hasText(error)) {
                return error;
            }

            String message = getString(root, "message");
            if (hasText(message)) {
                return message;
            }

            String nestedError = getNestedString(root, "data", "error");
            if (hasText(nestedError)) {
                return nestedError;
            }

            String nestedMessage = getNestedString(root, "data", "message");
            if (hasText(nestedMessage)) {
                return nestedMessage;
            }
        } catch (Exception ignored) {
            // usa fallback textual abaixo
        }

        String compact = body.replaceAll("\\s+", " ").trim();
        if (compact.length() > 220) {
            return compact.substring(0, 220) + "...";
        }
        return compact;
    }

    private ResponseEntity<String> postBillingRequest(HttpEntity<Map<String, Object>> request) {
        return restTemplate.postForEntity(
                baseUrl + "/billing/create",
                request,
                String.class
        );
    }

    private String extractCheckoutUrlFromJson(String body) {
        try {
            Map<?, ?> root = new ObjectMapper().readValue(body, Map.class);
            String url = getNestedString(root, "data", "url");
            if (hasText(url)) {
                return url;
            }
            url = getNestedString(root, "data", "checkoutUrl");
            if (hasText(url)) {
                return url;
            }
            url = getString(root, "checkoutUrl");
            if (hasText(url)) {
                return url;
            }
            return getString(root, "url");
        } catch (Exception ex) {
            return null;
        }
    }

    private String extractBillingIdFromJson(String body) {
        try {
            Map<?, ?> root = new ObjectMapper().readValue(body, Map.class);
            String id = getNestedString(root, "data", "id");
            if (hasText(id)) {
                return id;
            }
            return getString(root, "id");
        } catch (Exception ex) {
            return null;
        }
    }

    private String getNestedString(Map<?, ?> root, String parentKey, String childKey) {
        Object parent = root.get(parentKey);
        if (parent instanceof Map<?, ?> parentMap) {
            Object value = parentMap.get(childKey);
            return value == null ? null : value.toString();
        }
        return null;
    }

    private String getString(Map<?, ?> root, String key) {
        Object value = root.get(key);
        return value == null ? null : value.toString();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String normalizeTaxId(String value) {
        String normalized = normalizeDigits(value);
        return normalized == null ? "" : normalized;
    }

    private String normalizeDigits(String value) {
        if (value == null) {
            return "";
        }
        return value.replaceAll("\\D", "").trim();
    }

    private String appendQueryParam(String base, String key, String value) {
        if (base == null || base.isBlank()) {
            return base;
        }
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + key + "=" + value;
    }

}

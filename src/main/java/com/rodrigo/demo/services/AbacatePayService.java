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

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("frequency", "ONE_TIME");
        payload.put("methods", List.of("PIX", "CARD"));
        payload.put("products", buildProducts(order));
        payload.put("returnUrl", returnWithExternal);
        payload.put("completionUrl", completionWithExternal);
        payload.put("allowCoupons", false);
        payload.put("externalId", order.getExternalId());
        payload.put("metadata", Map.of("orderId", order.getId(), "externalId", order.getExternalId()));
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
        ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl + "/billing/create",
                request,
                String.class
        );

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Falha ao criar cobranca no AbacatePay.");
        }

        String body = response.getBody();
        String checkoutUrl = extractCheckoutUrl(body);
        String billingId = extractBillingId(body);
        return new AbacatePayCheckoutDTO(billingId, checkoutUrl);
    }

    private List<Map<String, Object>> buildProducts(Order order) {
        List<Map<String, Object>> products = new ArrayList<>();
        for (OrderItem item : order.getItems()) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("externalId", String.valueOf(item.getProduct().getId()));
            entry.put("name", item.getProduct().getName());
            entry.put("description", item.getProduct().getDescription() == null ? "" : item.getProduct().getDescription());
            entry.put("quantity", item.getQuantity());
            entry.put("price", Math.round(item.getProduct().getPrice() * 100));
            products.add(entry);
        }
        return products;
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

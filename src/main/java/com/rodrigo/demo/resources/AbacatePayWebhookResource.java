package com.rodrigo.demo.resources;

import com.rodrigo.demo.services.CheckoutService;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/webhooks/abacatepay")
public class AbacatePayWebhookResource {

    private static final Logger logger = LoggerFactory.getLogger(AbacatePayWebhookResource.class);

    @Autowired
    private CheckoutService checkoutService;

    @Value("${abacatepay.webhook-secret:}")
    private String webhookSecret;

    @PostMapping
    public ResponseEntity<Void> handle(@RequestParam(required = false, name = "webhookSecret") String webhookSecretParam,
                                       @RequestBody Map<String, Object> payload,
                                       HttpServletRequest request) {
        if (this.webhookSecret != null && !this.webhookSecret.isBlank()) {
            String headerSecret = getHeaderSecret(request);
            String providedSecret = chooseNonBlank(webhookSecretParam, headerSecret);
            if (providedSecret == null || !this.webhookSecret.equals(providedSecret)) {
                logger.warn("Webhook AbacatePay rejeitado: secret invalido (paramPresente={}, headerPresente={})",
                        hasText(webhookSecretParam), hasText(headerSecret));
                return ResponseEntity.status(403).build();
            }
        }

        Object dataObj = payload.get("data");
        if (!(dataObj instanceof Map)) {
            logger.warn("Webhook AbacatePay com payload invalido");
            return ResponseEntity.badRequest().build();
        }

        Map<?, ?> data = (Map<?, ?>) dataObj;
        Map<?, ?> billing = getNestedMap(data, "billing");
        String event = payload.get("event") == null ? null : payload.get("event").toString();
        String externalId = extractExternalId(data, billing);
        String billingId = getString(billing, "id");
        if (!hasText(billingId)) {
            billingId = getString(data, "id");
        }
        Long orderId = extractOrderId(data, billing);
        String status = getString(billing, "status");
        if (!hasText(status)) {
            status = getString(data, "status");
        }
        status = normalizeStatus(status, event);
        Instant paidAt = parseInstant(getString(billing, "paidAt"));
        if (paidAt == null) {
            paidAt = parseInstant(data.get("updatedAt"));
        }

        logger.info("Webhook AbacatePay recebido: event={}, status={}, externalId={}, billingId={}, orderId={}",
                event, status, externalId, billingId, orderId);

        if (!hasText(externalId) && !hasText(billingId) && orderId == null) {
            logger.warn("Webhook AbacatePay ignorado: sem identificadores");
            return ResponseEntity.ok().build();
        }

        try {
            checkoutService.applyBillingStatus(externalId, billingId, orderId, status, paidAt);
        } catch (ResourceNotFoundException ex) {
            logger.warn("Webhook AbacatePay nao encontrou pedido: {}", ex.getMessage());
        }

        return ResponseEntity.ok().build();
    }

    private String extractExternalId(Map<?, ?> data, Map<?, ?> billing) {
        String externalId = getString(data, "externalId");
        if (externalId != null && !externalId.isBlank()) {
            return externalId;
        }
        externalId = extractExternalIdFromMetadata(data);
        if (hasText(externalId)) {
            return externalId;
        }
        externalId = extractExternalIdFromMetadata(billing);
        if (hasText(externalId)) {
            return externalId;
        }
        Object billingCustomerObj = billing == null ? null : billing.get("customer");
        if (billingCustomerObj instanceof Map<?, ?> billingCustomer) {
            externalId = extractExternalIdFromMetadata(billingCustomer);
        }
        return externalId;
    }

    private Long extractOrderId(Map<?, ?> data, Map<?, ?> billing) {
        Long orderId = parseLong(extractOrderIdFromMetadata(data));
        if (orderId != null) {
            return orderId;
        }
        orderId = parseLong(extractOrderIdFromMetadata(billing));
        if (orderId != null) {
            return orderId;
        }
        Object billingCustomerObj = billing == null ? null : billing.get("customer");
        if (billingCustomerObj instanceof Map<?, ?> billingCustomer) {
            return parseLong(extractOrderIdFromMetadata(billingCustomer));
        }
        return null;
    }

    private String normalizeStatus(String status, String event) {
        if (status != null && !status.isBlank()) {
            return status;
        }
        if (event == null) {
            return null;
        }
        String normalized = event.trim().toLowerCase();
        if (normalized.contains("billing.paid")) {
            return "PAID";
        }
        if (normalized.contains("billing.failed")) {
            return "FAILED";
        }
        if (normalized.contains("billing.disputed") || normalized.contains("billing.canceled")) {
            return "CANCELED";
        }
        return null;
    }

    private String getString(Map<?, ?> data, String key) {
        if (data == null) {
            return null;
        }
        Object value = data.get(key);
        return value == null ? null : value.toString();
    }

    private Map<?, ?> getNestedMap(Map<?, ?> data, String key) {
        if (data == null) {
            return null;
        }
        Object nested = data.get(key);
        if (nested instanceof Map<?, ?> nestedMap) {
            return nestedMap;
        }
        return null;
    }

    private String extractExternalIdFromMetadata(Map<?, ?> data) {
        Object metadataObj = data == null ? null : data.get("metadata");
        if (metadataObj instanceof Map<?, ?> metadata) {
            return getString(metadata, "externalId");
        }
        return null;
    }

    private String extractOrderIdFromMetadata(Map<?, ?> data) {
        Object metadataObj = data == null ? null : data.get("metadata");
        if (metadataObj instanceof Map<?, ?> metadata) {
            return getString(metadata, "orderId");
        }
        return null;
    }

    private String getHeaderSecret(HttpServletRequest request) {
        String headerSecret = request.getHeader("X-AbacatePay-Webhook-Secret");
        if (hasText(headerSecret)) {
            return headerSecret;
        }
        headerSecret = request.getHeader("X-Webhook-Secret");
        if (hasText(headerSecret)) {
            return headerSecret;
        }
        headerSecret = request.getHeader("X-AbacatePay-Secret");
        return hasText(headerSecret) ? headerSecret : null;
    }

    private String chooseNonBlank(String primary, String fallback) {
        if (hasText(primary)) {
            return primary;
        }
        return hasText(fallback) ? fallback : null;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Instant parseInstant(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Instant.parse(value.toString());
        } catch (Exception ex) {
            return null;
        }
    }
}

package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.records.CheckoutResponseDTO;
import com.rodrigo.demo.entities.records.CheckoutRequestDTO;
import com.rodrigo.demo.entities.records.OrderResponseDTO;
import com.rodrigo.demo.entities.records.ShippingOptionDTO;
import com.rodrigo.demo.entities.records.ShippingQuoteRequestDTO;
import com.rodrigo.demo.entities.records.ShippingQuoteResponseDTO;
import com.rodrigo.demo.services.AbacatePayService;
import com.rodrigo.demo.services.CheckoutService;
import com.rodrigo.demo.services.ShippingQuoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/checkout")
public class CheckoutResource {

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private AbacatePayService abacatePayService;

    @Autowired
    private ShippingQuoteService shippingQuoteService;

    @PostMapping
    public ResponseEntity<CheckoutResponseDTO> checkout(
            Authentication auth,
            @RequestBody CheckoutRequestDTO request
    ) {
        Order order = checkoutService.checkout(
                auth.getName(),
                request.addressId()
        );

        ResolvedShipping shipping = resolveShipping(order, request);
        order = checkoutService.attachShippingInfo(order.getId(), shipping.amount(), shipping.label());

        boolean shouldRecreateBilling = shipping.amount() > 0.0 || request.shippingAmount() != null;
        if (shouldRecreateBilling) {
            order = checkoutService.prepareOrderForBillingRecreation(order.getId());
        }

        if (order.getAbacatePayCheckoutUrl() == null || order.getAbacatePayCheckoutUrl().isBlank() || shouldRecreateBilling) {
            var info = abacatePayService.createBilling(order, shipping.amount(), shipping.label());
            order = checkoutService.attachAbacatePayInfo(order.getId(), info);
        }

        return ResponseEntity.ok(new CheckoutResponseDTO(OrderResponseDTO.from(order), order.getAbacatePayCheckoutUrl()));
    }

    private ResolvedShipping resolveShipping(Order order, CheckoutRequestDTO request) {
        String requestedLabel = request.shippingLabel();

        if (request.shippingAmount() != null) {
            double requestedAmount = Math.max(0.0, request.shippingAmount());

            // Mantem label coerente com o preco quando vier apenas amount, ou quando houver divergencia.
            ShippingOptionDTO matchedByAmount = findOptionByPrice(order, requestedAmount);
            if (matchedByAmount != null && hasText(matchedByAmount.label())) {
                return new ResolvedShipping(requestedAmount, matchedByAmount.label());
            }

            return new ResolvedShipping(requestedAmount, normalizeLabel(requestedLabel));
        }

        // Se o pedido ja tinha frete definido, evita sobrescrever para PAC em chamadas sem frete explicito.
        if (order.getShippingAmount() != null && order.getShippingAmount() > 0.0 && !hasText(requestedLabel)) {
            return new ResolvedShipping(order.getShippingAmount(), normalizeLabel(order.getShippingLabel()));
        }

        if (order.getAddress() == null || order.getAddress().getZipCode() == null) {
            return new ResolvedShipping(0.0, normalizeLabel(requestedLabel));
        }

        try {
            ShippingQuoteResponseDTO quote = shippingQuoteService.quote(new ShippingQuoteRequestDTO(
                    order.getAddress().getZipCode(),
                    order.getTotal(),
                    countItems(order)
            ));

            ShippingOptionDTO selected = selectOptionForRequestedLabel(quote.options(), requestedLabel);
            if (selected == null) {
                selected = selectOptionForFallback(quote.options());
            }
            if (selected == null || selected.price() == null) {
                return new ResolvedShipping(0.0, normalizeLabel(requestedLabel));
            }

            String resolvedLabel = hasText(selected.label()) ? selected.label() : normalizeLabel(requestedLabel);
            return new ResolvedShipping(Math.max(0.0, selected.price()), resolvedLabel);
        } catch (Exception ex) {
            return new ResolvedShipping(0.0, normalizeLabel(requestedLabel));
        }
    }

    private ShippingOptionDTO findOptionByPrice(Order order, double requestedAmount) {
        if (requestedAmount <= 0.0 || order.getAddress() == null || order.getAddress().getZipCode() == null) {
            return null;
        }

        try {
            ShippingQuoteResponseDTO quote = shippingQuoteService.quote(new ShippingQuoteRequestDTO(
                    order.getAddress().getZipCode(),
                    order.getTotal(),
                    countItems(order)
            ));

            if (quote == null || quote.options() == null) {
                return null;
            }

            for (ShippingOptionDTO option : quote.options()) {
                if (option == null || option.price() == null) {
                    continue;
                }
                if (Math.abs(option.price() - requestedAmount) <= 0.01) {
                    return option;
                }
            }
        } catch (Exception ignored) {
            return null;
        }

        return null;
    }

    private ShippingOptionDTO selectOptionForRequestedLabel(List<ShippingOptionDTO> options, String requestedLabel) {
        if (!hasText(requestedLabel) || options == null || options.isEmpty()) {
            return null;
        }

        String needle = requestedLabel.trim().toLowerCase();
        for (ShippingOptionDTO option : options) {
            if (option == null) {
                continue;
            }

            String optionLabel = option.label() == null ? "" : option.label().toLowerCase();
            String optionService = option.service() == null ? "" : option.service().toLowerCase();
            String optionCarrier = option.carrier() == null ? "" : option.carrier().toLowerCase();

            if (optionLabel.contains(needle) || needle.contains(optionLabel)
                    || optionService.contains(needle) || needle.contains(optionService)
                    || optionCarrier.contains(needle) || needle.contains(optionCarrier)) {
                return option;
            }
        }

        return null;
    }

    private ShippingOptionDTO selectOptionForFallback(List<ShippingOptionDTO> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }

        ShippingOptionDTO cheapest = null;
        for (ShippingOptionDTO option : options) {
            if (option == null || option.price() == null) {
                continue;
            }
            if (cheapest == null || option.price() < cheapest.price()) {
                cheapest = option;
            }
        }
        return cheapest;
    }

    private int countItems(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return 1;
        }

        int count = 0;
        for (var item : order.getItems()) {
            count += Math.max(0, item.getQuantity());
        }
        return Math.max(1, count);
    }

    private String normalizeLabel(String value) {
        if (hasText(value)) {
            return value.trim();
        }
        return "Frete";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record ResolvedShipping(double amount, String label) {
    }
}
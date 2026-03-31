package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.records.CheckoutResponseDTO;
import com.rodrigo.demo.entities.records.CheckoutRequestDTO;
import com.rodrigo.demo.entities.records.OrderResponseDTO;
import com.rodrigo.demo.services.AbacatePayService;
import com.rodrigo.demo.services.CheckoutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/checkout")
public class CheckoutResource {

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private AbacatePayService abacatePayService;

    @PostMapping
    public ResponseEntity<CheckoutResponseDTO> checkout(
            Authentication auth,
            @RequestBody CheckoutRequestDTO request
    ) {
        Order order = checkoutService.checkout(
                auth.getName(),
                request.addressId()
        );

        if (order.getAbacatePayCheckoutUrl() == null || order.getAbacatePayCheckoutUrl().isBlank()) {
            var info = abacatePayService.createBilling(order);
            order = checkoutService.attachAbacatePayInfo(order.getId(), info);
        }

        return ResponseEntity.ok(new CheckoutResponseDTO(OrderResponseDTO.from(order), order.getAbacatePayCheckoutUrl()));
    }
}
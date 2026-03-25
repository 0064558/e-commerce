package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.records.OrderResponseDTO;
import com.rodrigo.demo.services.CheckoutService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/checkout")
public class CheckoutResource {

    @Autowired
    private CheckoutService checkoutService;

    @PostMapping
    public ResponseEntity<OrderResponseDTO> checkout(Authentication auth) {
        Order order = checkoutService.checkout(auth.getName());
        return ResponseEntity.ok(OrderResponseDTO.from(order));
    }
}
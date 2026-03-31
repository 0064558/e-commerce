package com.rodrigo.demo.entities.records;

public record CheckoutResponseDTO(OrderResponseDTO order, String checkoutUrl) {
}

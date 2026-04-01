package com.rodrigo.demo.entities.records;

public record ShippingQuoteRequestDTO(
        String zipCode,
        Double orderTotal,
        Integer itemCount
) {
}

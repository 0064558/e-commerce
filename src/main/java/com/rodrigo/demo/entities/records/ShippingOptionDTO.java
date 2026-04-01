package com.rodrigo.demo.entities.records;

public record ShippingOptionDTO(
        String id,
        String carrier,
        String service,
        String label,
        Double price,
        Integer minDays,
        Integer maxDays
) {
}

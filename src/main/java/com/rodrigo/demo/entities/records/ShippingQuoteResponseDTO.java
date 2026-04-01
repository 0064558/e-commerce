package com.rodrigo.demo.entities.records;

import java.util.List;

public record ShippingQuoteResponseDTO(
        String source,
        List<ShippingOptionDTO> options
) {
}

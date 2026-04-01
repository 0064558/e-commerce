package com.rodrigo.demo.entities.records;

public record CheckoutRequestDTO(
	Long addressId,
	Double shippingAmount,
	String shippingLabel
) {
}
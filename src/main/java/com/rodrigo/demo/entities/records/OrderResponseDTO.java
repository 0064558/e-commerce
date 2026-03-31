package com.rodrigo.demo.entities.records;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.OrderItem;

import java.time.Instant;
import java.util.List;

public record OrderResponseDTO(
        Long id,
        String externalId,
    String checkoutUrl,
        Instant moment,
        String orderStatus,
        String clientEmail,
        String clientName,
        List<OrderItemDTO> items,
        Double total,
        Instant paymentMoment,
        AddressResponseDTO address
) {

    public record OrderItemDTO(
            Long productId,
            String productName,
            Double productPrice,
            Integer quantity,
            Double subTotal
    ) {
        public static OrderItemDTO from(OrderItem item) {
            return new OrderItemDTO(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getPrice(),
                    item.getQuantity(),
                    item.getSubTotal()
            );
        }
    }

    public static OrderResponseDTO from(Order order) {
        return new OrderResponseDTO(
                order.getId(),
                order.getExternalId(),
                order.getAbacatePayCheckoutUrl(),
                order.getMoment(),
                order.getOrderStatus().name(),
                order.getClient().getEmail(),
                order.getClient().getName(),
                order.getItems().stream().map(OrderItemDTO::from).toList(),
                order.getTotal(),
                order.getPayment() != null ? order.getPayment().getMoment() : null,
                order.getAddress() != null ? AddressResponseDTO.from(order.getAddress()) : null
        );
    }
}
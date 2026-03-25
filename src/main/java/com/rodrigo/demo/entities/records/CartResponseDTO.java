package com.rodrigo.demo.entities.records;

import com.rodrigo.demo.entities.Cart;
import com.rodrigo.demo.entities.CartItem;

import java.time.Instant;
import java.util.List;

public record CartResponseDTO(
        Long id,
        String userEmail,
        List<CartItemDTO> items,
        Double total,
        Instant updatedAt
) {
    public record CartItemDTO(
            Long productId,
            String productName,
            Double productPrice,
            Integer quantity,
            Double subTotal
    ) {
        public static CartItemDTO from(CartItem item) {
            return new CartItemDTO(
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getProduct().getPrice(),
                    item.getQuantity(),
                    item.getSubTotal()
            );
        }
    }

    public static CartResponseDTO from(Cart cart) {
        return new CartResponseDTO(
                cart.getId(),
                cart.getUser().getEmail(),
                cart.getItems().stream().map(CartItemDTO::from).toList(),
                cart.getTotal(),
                cart.getUpdatedAt()
        );
    }
}
package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Cart;
import com.rodrigo.demo.entities.records.CartResponseDTO;
import com.rodrigo.demo.services.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
public class CartResource {

    @Autowired
    private CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponseDTO> getCart(Authentication auth) {
        Cart cart = cartService.getCart(auth.getName());
        return ResponseEntity.ok(CartResponseDTO.from(cart));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponseDTO> addItem(Authentication auth,
                                                   @RequestParam Long productId,
                                                   @RequestParam Integer quantity) {
        Cart cart = cartService.addItem(auth.getName(), productId, quantity);
        return ResponseEntity.ok(CartResponseDTO.from(cart));
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<CartResponseDTO> updateItem(Authentication auth,
                                                      @PathVariable Long productId,
                                                      @RequestParam Integer quantity) {
        Cart cart = cartService.updateQuantity(auth.getName(), productId, quantity);
        return ResponseEntity.ok(CartResponseDTO.from(cart));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<CartResponseDTO> removeItem(Authentication auth,
                                                      @PathVariable Long productId) {
        Cart cart = cartService.removeItem(auth.getName(), productId);
        return ResponseEntity.ok(CartResponseDTO.from(cart));
    }

    @DeleteMapping
    public ResponseEntity<CartResponseDTO> clearCart(Authentication auth) {
        cartService.clearCart(auth.getName());
        Cart cart = cartService.getCart(auth.getName());
        return ResponseEntity.ok(CartResponseDTO.from(cart));
    }
}
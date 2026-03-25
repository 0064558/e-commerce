package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Cart;
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
    public ResponseEntity<Cart> getCart(Authentication auth) {
        return ResponseEntity.ok(cartService.getCart(auth.getName()));
    }

    @PostMapping("/items")
    public ResponseEntity<Cart> addItem(Authentication auth,
                                        @RequestParam Long productId,
                                        @RequestParam Integer quantity) {
        return ResponseEntity.ok(cartService.addItem(auth.getName(), productId, quantity));
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<Cart> updateItem(Authentication auth,
                                           @PathVariable Long productId,
                                           @RequestParam Integer quantity) {
        return ResponseEntity.ok(cartService.updateQuantity(auth.getName(), productId, quantity));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<Cart> removeItem(Authentication auth,
                                           @PathVariable Long productId) {
        return ResponseEntity.ok(cartService.removeItem(auth.getName(), productId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(Authentication auth) {
        cartService.clearCart(auth.getName());
        return ResponseEntity.noContent().build();
    }
}
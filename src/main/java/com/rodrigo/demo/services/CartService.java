package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.Cart;
import com.rodrigo.demo.entities.CartItem;
import com.rodrigo.demo.entities.Product;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.entities.pk.CartItemPK;
import com.rodrigo.demo.repositories.CartRepository;
import com.rodrigo.demo.repositories.CartItemRepository;
import com.rodrigo.demo.repositories.ProductRepository;
import com.rodrigo.demo.repositories.UserRepository;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class CartService {

    @Autowired private CartRepository cartRepository;
    @Autowired private CartItemRepository cartItemRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private UserRepository userRepository;

    public Cart getOrCreateCart(String email) {
        User user = (User) userRepository.findByEmail(email);
        return cartRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUser(user);
                    return cartRepository.save(cart);
                });
    }

    public Cart getCart(String email) {
        return getOrCreateCart(email);
    }

    public Cart addItem(String email, Long productId, Integer quantity) {
        Cart cart = getOrCreateCart(email);
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException(productId));

        CartItemPK pk = new CartItemPK(cart, product);
        cartItemRepository.findByCartIdAndProductId(pk).ifPresentOrElse(
                item -> item.setQuantity(item.getQuantity() + quantity),
                () -> {
                    CartItem item = new CartItem();
                    item.getId().setCart(cart);
                    item.getId().setProduct(product);
                    item.setQuantity(quantity);
                    cart.getItems().add(item);
                }
        );

        cart.setUpdatedAt(Instant.now());
        return cartRepository.save(cart);
    }

    public Cart removeItem(String email, Long productId) {
        Cart cart = getOrCreateCart(email);
        cart.getItems().removeIf(i -> i.getProduct().getId().equals(productId));
        cart.setUpdatedAt(Instant.now());
        return cartRepository.save(cart);
    }

    public Cart updateQuantity(String email, Long productId, Integer quantity) {
        if (quantity <= 0) return removeItem(email, productId);
        Cart cart = getOrCreateCart(email);
        cart.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst()
                .ifPresent(i -> i.setQuantity(quantity));
        cart.setUpdatedAt(Instant.now());
        return cartRepository.save(cart);
    }

    public void clearCart(String email) {
        Cart cart = getOrCreateCart(email);
        cart.getItems().clear();
        cartRepository.save(cart);
    }
}
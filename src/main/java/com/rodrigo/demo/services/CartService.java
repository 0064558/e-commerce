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
import java.util.Optional;

@Service
public class CartService {

    @Autowired
    private CartRepository cartRepository;
    @Autowired
    private CartItemRepository cartItemRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private UserRepository userRepository;

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
        Optional<CartItem> existingItem = cartItemRepository.findById(pk);

        if (existingItem.isPresent()) {
            existingItem.get().setQuantity(existingItem.get().getQuantity() + quantity);
        } else {
            CartItem newItem = new CartItem();
            newItem.setId(new CartItemPK(cart, product));
            newItem.setQuantity(quantity);
            cart.getItems().add(newItem);
        }

        cart.setUpdatedAt(Instant.now());
        return cartRepository.save(cart);
    }

    public Cart removeItem(String email, Long productId) {
        Cart cart = getOrCreateCart(email);
        boolean removed = cart.getItems().removeIf(
                i -> i.getProduct().getId().equals(productId)
        );
        if (!removed) {
            throw new ResourceNotFoundException(productId);
        }
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
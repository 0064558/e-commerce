package com.rodrigo.demo.entities;

import com.rodrigo.demo.entities.pk.CartItemPK;
import jakarta.persistence.*;

import java.io.Serializable;

@Entity
@Table(name = "cart_items")
public class CartItem implements Serializable {
    private static final long serialVersionUID = 1L;

    @EmbeddedId
    private CartItemPK id = new CartItemPK();


    @ManyToOne
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product;

    private Integer quantity;

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Cart getCart() {
        return cart;
    }

    public void setCart(Cart cart) {
        this.cart = cart;
    }

    public CartItemPK getId() {
        return id;
    }

    public void setId(CartItemPK id) {
        this.id = id;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public double getSubTotal() {
        return product.getPrice() * quantity;
    }
}

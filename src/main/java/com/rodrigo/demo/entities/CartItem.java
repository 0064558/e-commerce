package com.rodrigo.demo.entities;

import com.rodrigo.demo.entities.pk.CartItemPK;
import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "cart_items")
public class CartItem implements Serializable {
    private static final long serialVersionUID = 1L;

    @EmbeddedId
    private CartItemPK id = new CartItemPK();

    private Integer quantity;

    public Cart getCart() {
        return id.getCart();
    }

    public void setCart(Cart cart) {
        id.setCart(cart);
    }

    public Product getProduct() {
        return id.getProduct();
    }

    public void setProduct(Product product) {
        id.setProduct(product);
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
        return id.getProduct().getPrice() * quantity;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        CartItem cartItem = (CartItem) o;
        return Objects.equals(id, cartItem.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}

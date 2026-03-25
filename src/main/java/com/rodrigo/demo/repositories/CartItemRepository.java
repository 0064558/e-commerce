package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.CartItem;
import com.rodrigo.demo.entities.pk.CartItemPK;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, CartItemPK> {

}

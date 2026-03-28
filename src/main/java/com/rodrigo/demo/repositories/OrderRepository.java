package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClientEmail(String email);
}

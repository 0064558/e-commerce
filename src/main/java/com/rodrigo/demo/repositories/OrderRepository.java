package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByClientEmail(String email);

    boolean existsByClientId(Long clientId);

    Optional<Order> findByExternalId(String externalId);

    Optional<Order> findFirstByClientEmailAndOrderStatusOrderByMomentDesc(String email, Integer orderStatus);

    Optional<Order> findByAbacatePayBillingId(String abacatePayBillingId);
}

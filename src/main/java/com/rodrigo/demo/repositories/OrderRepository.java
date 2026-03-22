package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.Order;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
    // Métodos customizados podem ser adicionados aqui
    // Exemplo: User findByEmail(String email);
    // O Spring Data JPA implementa automaticamente baseado no nome do método
}

package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.entities.records.OrderResponseDTO;
import com.rodrigo.demo.services.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(value = "/orders")
public class OrderResource {

    @Autowired
    private OrderService service;

    // ADMIN: retorna todos os pedidos do sistema
    @GetMapping
    public ResponseEntity<List<OrderResponseDTO>> findAll() {
        List<Order> list = service.findAll();
        List<OrderResponseDTO> dtoList = list.stream()
                .map(OrderResponseDTO::from)
                .toList();
        return ResponseEntity.ok(dtoList);
    }

    // USER: retorna apenas os pedidos do usuário autenticado
    @GetMapping("/me")
    public ResponseEntity<List<OrderResponseDTO>> findMyOrders(Authentication auth) {
        List<Order> list = service.findByClientEmail(auth.getName());
        List<OrderResponseDTO> dtoList = list.stream()
                .map(OrderResponseDTO::from)
                .toList();
        return ResponseEntity.ok(dtoList);
    }

    @GetMapping(value = "/{id}")
    public ResponseEntity<OrderResponseDTO> findById(@PathVariable Long id) {
        Order obj = service.findById(id);
        return ResponseEntity.ok(OrderResponseDTO.from(obj));
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/{id}")
    public ResponseEntity<OrderResponseDTO> update(@PathVariable Long id, @RequestBody Order obj) {
        obj = service.update(id, obj);
        return ResponseEntity.ok(OrderResponseDTO.from(obj));
    }
}

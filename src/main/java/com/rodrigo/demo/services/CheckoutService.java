package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.*;
import com.rodrigo.demo.entities.enums.OrderStatus;
import com.rodrigo.demo.repositories.*;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class CheckoutService {
    @Autowired private CartService cartService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ProductRepository productRepository;

    @Transactional
    public Order checkout(String email) {
        // Busca o carrinho do usuário
        Cart cart = cartService.getOrCreateCart(email);

        // Verificar se o carrinho está vazio
        if(cart.getItems().isEmpty()) {
            throw new IllegalStateException("O carrinho está vazio!");
        }

        // Valida estoque de cada item
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new IllegalStateException("Estoque insuficiente para o produto: " + product.getName()
                        + ". Disponível: " + product.getStockQuantity()
                        + ", Necessário: " + cartItem.getQuantity());
            }
        }

        // Criar pedido
        Order order = new Order();
        order.setClient((User) cart.getUser());
        order.setMoment(Instant.now());
        order.setOrderStatus(OrderStatus.WAITING_PAYMENT);

        // Adicionar itens do carrinho ao pedido
        for (CartItem cartItem : cart.getItems()) {
            OrderItem orderItem = new OrderItem(
                    order,
                    cartItem.getProduct(),
                    cartItem.getQuantity(),
                    cartItem.getProduct().getPrice()
            );
            order.getItems().add(orderItem);
        }

        // Salvar pedido
        orderRepository.save(order);

        // Simula pagamento bem-sucedido e atualiza status do pedido
        Payment payment = new Payment();
        payment.setMoment(Instant.now());
        payment.setOrder(order);
        order.setPayment(payment);
        order.setOrderStatus(OrderStatus.PAID);
        orderRepository.save(order);

        // Reduzir estoque dos produtos
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            product.setStockQuantity(product.getStockQuantity() - cartItem.getQuantity());
            productRepository.save(product);
        }

        // Limpar carrinho
        cart.getItems().clear();

        return order;

    }
}

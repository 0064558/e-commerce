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

    @Autowired
    private CartService cartService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AddressRepository addressRepository;

    @Transactional
    public Order checkout(String email, Long addressId) {

        // Busca o carrinho do usuário
        Cart cart = cartService.getOrCreateCart(email);

        // Carrinho vazio
        if (cart.getItems().isEmpty()) {
            throw new IllegalStateException("O carrinho está vazio!");
        }

        // Valida estoque
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();

            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new IllegalStateException(
                        "Estoque insuficiente para o produto: " + product.getName()
                                + ". Disponível: " + product.getStockQuantity()
                                + ", Necessário: " + cartItem.getQuantity()
                );
            }
        }

        // Busca endereço
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new ResourceNotFoundException(addressId));

        // Segurança (endereço pertence ao usuário?)
        if (!address.getUser().getEmail().equals(email)) {
            throw new RuntimeException("Endereço não pertence ao usuário");
        }

        // Criar pedido
        Order order = new Order();
        order.setClient((User) cart.getUser());
        order.setMoment(Instant.now());
        order.setOrderStatus(OrderStatus.WAITING_PAYMENT);

        // ASSOCIA O ENDEREÇO (ESSENCIAL)
        order.setAddress(address);

        // Adicionar itens
        for (CartItem cartItem : cart.getItems()) {
            OrderItem orderItem = new OrderItem(
                    order,
                    cartItem.getProduct(),
                    cartItem.getQuantity(),
                    cartItem.getProduct().getPrice()
            );
            order.getItems().add(orderItem);
        }

        // Criar pagamento (ANTES do save)
        Payment payment = new Payment();
        payment.setMoment(Instant.now());
        payment.setOrder(order);

        order.setPayment(payment);
        order.setOrderStatus(OrderStatus.PAID);

        // Salva UMA VEZ (cascade cuida do resto)
        order = orderRepository.save(order);

        // Atualiza estoque
        for (CartItem cartItem : cart.getItems()) {
            Product product = cartItem.getProduct();
            product.setStockQuantity(
                    product.getStockQuantity() - cartItem.getQuantity()
            );
            productRepository.save(product);
        }

        // Limpa carrinho
        cart.getItems().clear();

        return order;
    }
}
package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.*;
import com.rodrigo.demo.entities.enums.OrderStatus;
import com.rodrigo.demo.entities.records.AbacatePayCheckoutDTO;
import com.rodrigo.demo.repositories.*;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class CheckoutService {

    private static final Logger logger = LoggerFactory.getLogger(CheckoutService.class);

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
            Order existing = orderRepository
                    .findFirstByClientEmailAndOrderStatusOrderByMomentDesc(email, OrderStatus.WAITING_PAYMENT.getCode())
                    .orElse(null);
            if (existing != null) {
                existing.setOrderStatus(OrderStatus.CANCELED);
                orderRepository.save(existing);
            }
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

        Order existing = orderRepository
                .findFirstByClientEmailAndOrderStatusOrderByMomentDesc(email, OrderStatus.WAITING_PAYMENT.getCode())
                .orElse(null);
        if (existing != null) {
            if (cartMatchesOrder(existing, cart)) {
                if (existing.getAddress() == null || !existing.getAddress().getId().equals(addressId)) {
                    existing.setAddress(address);
                    return orderRepository.save(existing);
                }
                return existing;
            }
            existing.setOrderStatus(OrderStatus.CANCELED);
            orderRepository.save(existing);
        }

        // Criar pedido
        Order order = new Order();
        order.setClient((User) cart.getUser());
        order.setMoment(Instant.now());
        order.setOrderStatus(OrderStatus.WAITING_PAYMENT);
        order.setExternalId(UUID.randomUUID().toString());

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

        // Salva UMA VEZ (cascade cuida do resto)
        return orderRepository.save(order);
    }

    private boolean cartMatchesOrder(Order order, Cart cart) {
        if (order == null || cart == null) {
            return false;
        }
        if (order.getItems().size() != cart.getItems().size()) {
            return false;
        }

        Map<Long, Integer> orderItems = new HashMap<>();
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() == null) {
                return false;
            }
            orderItems.put(item.getProduct().getId(), item.getQuantity());
        }

        for (CartItem item : cart.getItems()) {
            if (item.getProduct() == null) {
                return false;
            }
            Integer quantity = orderItems.get(item.getProduct().getId());
            if (quantity == null || !quantity.equals(item.getQuantity())) {
                return false;
            }
        }

        return true;
    }

    @Transactional
    public Order attachAbacatePayInfo(Long orderId, AbacatePayCheckoutDTO info) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(orderId));
        order.setAbacatePayBillingId(info.billingId());
        order.setAbacatePayCheckoutUrl(info.checkoutUrl());
        return orderRepository.save(order);
    }

    @Transactional
    public Order attachShippingInfo(Long orderId, Double shippingAmount, String shippingLabel) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(orderId));

        double amount = shippingAmount == null ? 0.0 : Math.max(0.0, shippingAmount);
        order.setShippingAmount(amount);
        order.setShippingLabel(resolveShippingLabel(shippingLabel, amount));

        return orderRepository.save(order);
    }

    @Transactional
    public Order prepareOrderForBillingRecreation(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(orderId));

        // AbacatePay pode reaproveitar checkout antigo quando externalId se repete.
        order.setExternalId(UUID.randomUUID().toString());
        order.setAbacatePayBillingId(null);
        order.setAbacatePayCheckoutUrl(null);

        return orderRepository.save(order);
    }

    private String resolveShippingLabel(String shippingLabel, double shippingAmount) {
        if (shippingLabel != null && !shippingLabel.isBlank()) {
            return shippingLabel.trim();
        }
        if (shippingAmount > 0.0) {
            return "Frete";
        }
        return "Frete grátis";
    }

    @Transactional
    public void applyBillingStatus(String externalId, String billingId, Long orderId, String status, Instant paidAt) {
        Order order = null;
        if (orderId != null) {
            order = orderRepository.findById(orderId).orElse(null);
        }
        if (order == null && externalId != null && !externalId.isBlank()) {
            order = orderRepository.findByExternalId(externalId).orElse(null);
        }
        if (order == null && billingId != null && !billingId.isBlank()) {
            order = orderRepository.findByAbacatePayBillingId(billingId).orElse(null);
        }
        if (order == null) {
            Object ref = orderId != null ? orderId : (externalId != null && !externalId.isBlank() ? externalId : billingId);
            throw new ResourceNotFoundException(ref);
        }

        String normalized = status == null ? "" : status.trim().toUpperCase();
        if ("PAID".equals(normalized)) {
            if (OrderStatus.PAID.equals(order.getOrderStatus())) {
                return;
            }
            Map<Long, Product> lockedProducts = lockAndValidateStock(order);
            if (lockedProducts == null) {
                order.setOrderStatus(OrderStatus.CANCELED);
                logger.warn("Pedido cancelado por falta de estoque no pagamento. orderId={}", order.getId());
                orderRepository.save(order);
                return;
            }
            order.setOrderStatus(OrderStatus.PAID);
            if (order.getPayment() == null) {
                Payment payment = new Payment();
                payment.setOrder(order);
                order.setPayment(payment);
            }
            order.getPayment().setMoment(paidAt != null ? paidAt : Instant.now());

            for (OrderItem item : order.getItems()) {
                Product product = lockedProducts.get(item.getProduct().getId());
                if (product == null) {
                    order.setOrderStatus(OrderStatus.CANCELED);
                    logger.warn("Pedido cancelado por produto ausente durante pagamento. orderId={}, productId={}",
                            order.getId(), item.getProduct().getId());
                    orderRepository.save(order);
                    return;
                }
                product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
                productRepository.save(product);
            }

            cartService.clearCart(order.getClient().getEmail());
        } else if ("FAILED".equals(normalized) || "CANCELED".equals(normalized)) {
            order.setOrderStatus(OrderStatus.CANCELED);
        } else if ("WAITING_PAYMENT".equals(normalized) || "PENDING".equals(normalized)) {
            order.setOrderStatus(OrderStatus.WAITING_PAYMENT);
        }

        orderRepository.save(order);
    }

    private Map<Long, Product> lockAndValidateStock(Order order) {
        if (order == null || order.getItems() == null) {
            return null;
        }

        Map<Long, Product> lockedProducts = new HashMap<>();
        for (OrderItem item : order.getItems()) {
            if (item.getProduct() == null || item.getProduct().getId() == null) {
                return null;
            }
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId())
                    .orElseThrow(() -> new ResourceNotFoundException(item.getProduct().getId()));
            if (product.getStockQuantity() < item.getQuantity()) {
                logger.warn("Estoque insuficiente na confirmacao de pagamento. orderId={}, productId={}, disponivel={}, solicitado={}",
                    order.getId(), product.getId(), product.getStockQuantity(), item.getQuantity());
                return null;
            }
            lockedProducts.put(product.getId(), product);
        }
        return lockedProducts;
    }
}
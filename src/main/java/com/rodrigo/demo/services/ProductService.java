package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.Product;
import com.rodrigo.demo.entities.Product;
import com.rodrigo.demo.repositories.ProductRepository;
import com.rodrigo.demo.repositories.ProductRepository;
import com.rodrigo.demo.services.exceptions.DatabaseException;
import com.rodrigo.demo.services.exceptions.ResourceNotFoundException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * SERVICE - Camada de Serviço (Business Logic Layer)
 *
 * A camada de serviço contém a lógica de negócio da aplicação.
 * Atua como intermediária entre o Controller (Resource) e o Repository.
 *
 * Responsabilidades:
 * - Implementar regras de negócio
 * - Orquestrar transações
 * - Transformar dados quando necessário
 * - Lançar exceções de negócio
 *
 * @Component: registra a classe como bean do Spring (injeção de dependência)
 * Alternativa mais específica: @Service (semanticamente mais clara)
 *
 * Injeção de Dependência:
 * - @Autowired injeta o ProductRepository automaticamente
 * - O Spring gerencia o ciclo de vida do bean
 */
@Component
public class ProductService {

    /**
     * Repository injetado pelo Spring via @Autowired.
     * O Spring busca a implementação de ProductRepository (criada automaticamente
     * pelo Spring Data JPA) e injeta aqui.
     */
    @Autowired
    private ProductRepository repository;

    /**
     * Busca todos os usuários cadastrados.
     *
     * @return Lista de todos os usuários (pode ser vazia)
     */
    public List<Product> findAll() {
        return repository.findAll();
    }

    /**
     * Busca um usuário pelo ID.
     *
     * @param id Identificador do usuário
     * @return O usuário encontrado
     * @throws NoSuchElementException se o usuário não existir
     *
     * NOTA: obj.get() lança NoSuchElementException se vazio.
     * Em produção, considere lançar uma exceção customizada como
     * ResourceNotFoundException ou usar orElseThrow().
     */
    public Product findById(Long id) {
        Optional<Product> obj = repository.findById(id);
        return obj.get();
    }

    public Product insert(Product obj) {
        return repository.save(obj);
    }

    public void delete(Long id) {
        try {
            if (!repository.existsById(id)) {
                throw new ResourceNotFoundException(id);
            }
            repository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            throw new DatabaseException("Product has orders and cannot be deleted");
        }
    }

    public Product update(Long id, Product obj) {
        try {
            if (!repository.existsById(id)) {
                throw new ResourceNotFoundException(id);
            }
            Product entity = repository.getReferenceById(id);
            updateData(entity, obj);
            return repository.save(entity);
        } catch (EntityNotFoundException e) {
            throw new ResourceNotFoundException(id);
        }
    }

    private void updateData(Product entity, Product obj) {
        entity.setName(obj.getName());
        entity.setDescription(obj.getDescription());
        entity.setPrice(obj.getPrice());
        entity.setImgUrl(obj.getImgUrl());
        if (obj.getCategories() != null && !obj.getCategories().isEmpty()) {
            entity.getCategories().clear();
            entity.getCategories().addAll(obj.getCategories());
        }
    }
}

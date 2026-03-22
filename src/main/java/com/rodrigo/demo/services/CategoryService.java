package com.rodrigo.demo.services;

import com.rodrigo.demo.entities.Category;
import com.rodrigo.demo.entities.User;
import com.rodrigo.demo.repositories.CategoryRepository;
import com.rodrigo.demo.repositories.UserRepository;
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
 * <p>
 * A camada de serviço contém a lógica de negócio da aplicação.
 * Atua como intermediária entre o Controller (Resource) e o Repository.
 * <p>
 * Responsabilidades:
 * - Implementar regras de negócio
 * - Orquestrar transações
 * - Transformar dados quando necessário
 * - Lançar exceções de negócio
 *
 * @Component: registra a classe como bean do Spring (injeção de dependência)
 * Alternativa mais específica: @Service (semanticamente mais clara)
 * <p>
 * Injeção de Dependência:
 * - @Autowired injeta o UserRepository automaticamente
 * - O Spring gerencia o ciclo de vida do bean
 */
@Component
public class CategoryService {

    /**
     * Repository injetado pelo Spring via @Autowired.
     * O Spring busca a implementação de UserRepository (criada automaticamente
     * pelo Spring Data JPA) e injeta aqui.
     */
    @Autowired
    private CategoryRepository repository;

    /**
     * Busca todos os usuários cadastrados.
     *
     * @return Lista de todos os usuários (pode ser vazia)
     */
    public List<Category> findAll() {
        return repository.findAll();
    }

    /**
     * Busca um usuário pelo ID.
     *
     * @param id Identificador do usuário
     * @return O usuário encontrado
     * @throws NoSuchElementException se o usuário não existir
     *                                <p>
     *                                NOTA: obj.get() lança NoSuchElementException se vazio.
     *                                Em produção, considere lançar uma exceção customizada como
     *                                ResourceNotFoundException ou usar orElseThrow().
     */
    public Category findById(Long id) {
        Optional<Category> obj = repository.findById(id);
        return obj.get();
    }

    public Category insert(Category obj) {
        repository.save(obj);
        return obj;
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException(id);
        }
        repository.deleteById(id);
    }

    public Category update(Long id, Category obj) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException(id);
        }
        Category entity = repository.getReferenceById(id);
        entity.setName(obj.getName());
        return repository.save(entity);
    }

}

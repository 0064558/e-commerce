package com.rodrigo.demo.repositories;

import com.rodrigo.demo.entities.Product;
import com.rodrigo.demo.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * REPOSITORY - Camada de Acesso a Dados (Data Access Layer)
 *
 * O padrão Repository isola a lógica de acesso a dados do restante da aplicação.
 * Atua como uma coleção em memória de objetos do domínio.
 *
 * Spring Data JPA:
 * - JpaRepository estende a interface e fornece CRUD pronto
 * - Métodos herdados: save, findById, findAll, deleteById, etc.
 * - Spring gera a implementação em tempo de execução (proxy)
 *
 * Parâmetros genéricos:
 * - User: tipo da entidade
 * - Long: tipo da chave primária
 *
 * Por ser uma interface, não há implementação manual:
 * - O Spring Data JPA cria automaticamente as queries JPQL
 * - Convenções de nomenclatura permitem criar queries customizadas
 *   Ex: findByEmail(String email) → SELECT u FROM User u WHERE u.email = :email
 */
public interface ProductRepository extends JpaRepository<Product, Long> {
    // Métodos customizados podem ser adicionados aqui
    // Exemplo: Product findByEmail(String email);
    // O Spring Data JPA implementa automaticamente baseado no nome do método
}

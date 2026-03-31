package com.rodrigo.demo.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rodrigo.demo.entities.enums.UserRole;
import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;

/**
 * ENTIDADE JPA - Camada de Modelo (Domain Model)
 *
 * Esta classe representa a tabela "tb_user" no banco de dados.
 * É uma classe POJO (Plain Old Java Object) mapeada para o banco relacional.
 *
 * Anotações JPA utilizadas:
 * - @Entity: marca a classe como entidade persistente
 * - @Table: define o nome da tabela no banco (opcional, padrão seria "user")
 * - @Id: define a chave primária
 * - @GeneratedValue: define geração automática do ID
 *
 * Implementa Serializable para permitir serialização (ex: cache, sessões HTTP)
 */
@Entity
@Table(name = "tb_user")
public class User implements Serializable, UserDetails {
    // serialVersionUID para compatibilidade de serialização
    // NOTA: Há um erro de digitação - deveria ser "serialVersionUID" (com "I" maiúsculo)
    private static final long serialVersionUID = 1L;

    /**
     * Chave primária da entidade.
     * GenerationType.IDENTITY usa auto-increment do banco de dados.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Atributos mapeados automaticamente para colunas com mesmo nome
    private String name;
    @Column(unique = true)
    private String email;

    private String phone;
    private String taxId;
    private String password;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    // Um client tem muitos pedidos
    @OneToMany(mappedBy = "client")
    @JsonIgnore
    private List<Order> orders = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Address> addres = new ArrayList<>();


    // Construtor padrão - OBRIGATÓRIO para JPA
    // O Hibernate precisa para instanciar via reflection
    public User() {
    }

    public User(String name, String email, String phone, String password, UserRole role) {
        this(name, email, phone, null, password, role);
    }

    public User(String name, String email, String phone, String taxId, String password, UserRole role) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.taxId = taxId;
        this.password = password;
        this.role = role;
    }

    // Construtor com argumentos - conveniência para criar objetos
    public User(Long id, String name, String email, String phone, String password, UserRole role) {
        this(id, name, email, phone, null, password, role);
    }

    public User(Long id, String name, String email, String phone, String taxId, String password, UserRole role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.taxId = taxId;
        this.password = password;
        this.role = role;
    }

    // ==================== GETTERS E SETTERS ====================
    // Métodos de acesso aos atributos - necessários para encapsulamento

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getTaxId() {
        return taxId;
    }

    public void setTaxId(String taxId) {
        this.taxId = taxId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if(this.role == UserRole.ADMIN) {
            return List.of((new SimpleGrantedAuthority("ROLE_ADMIN")), new SimpleGrantedAuthority("ROLE_USER"));
        } else {
            return List.of(new SimpleGrantedAuthority("ROLE_USER"));
        }
    }

    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public List<Order> getOrders() {
        return orders;
    }

    public List<Address> getAdresses() {
        return addres;
    }

    // ==================== EQUALS E HASHCODE ====================
    // Importante: baseados apenas no ID (chave de negócio)
    // Isso permite comparar entidades pelo ID, não pela referência de objeto

    /**
     * Comparação baseada no ID.
     * Duas entidades são consideradas iguais se tiverem o mesmo ID.
     */
    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id);
    }

    /**
     * HashCode consistente com equals.
     * Usa apenas o ID para manter o contrato: objetos iguais devem ter mesmo hashCode.
     */
    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}

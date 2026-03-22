package com.rodrigo.demo.resources;

import com.rodrigo.demo.entities.Order;
import com.rodrigo.demo.services.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * RESOURCE/CONTROLLER - Camada de API (Presentation Layer)
 *
 * O Resource é o ponto de entrada da aplicação REST.
 * Recebe requisições HTTP, delega para a camada de serviço e retorna respostas.
 *
 * Anotações:
 * - @RestController: combina @Controller + @ResponseBody
 *   Indica que o retorno dos métodos é serializado diretamente no corpo da resposta
 * - @RequestMapping: define o path base para todos os endpoints deste controller
 *
 * Padrão RESTful:
 * - GET /users → retorna todos os usuários
 * - GET /users/{id} → retorna usuário específico
 * - POST /users → cria novo usuário
 * - PUT /users/{id} → atualiza usuário
 * - DELETE /users/{id} → remove usuário
 *
 * ResponseEntity: wrapper do Spring para respostas HTTP
 * - Permite controlar status code, headers e body
 */
@RestController
@RequestMapping(value = "/orders")
public class OrderResource {

    /**
     * Service injetado pelo Spring.
     * O Controller não deve conter lógica de negócio - delega para o Service.
     */
    @Autowired
    private OrderService service;

    /**
     * Endpoint: GET /users
     * Retorna todos os usuários cadastrados.
     *
     * @return ResponseEntity com lista de usuários e status 200 (OK)
     */
    @GetMapping
    public ResponseEntity<List<Order>> findAll() {
        // Delega a busca para a camada de serviço
        List<Order> list = service.findAll();
        // Retorna resposta HTTP 200 com a lista no corpo
        return ResponseEntity.ok().body(list);
    }

    /**
     * Endpoint: GET /users/{id}
     * Retorna um usuário específico pelo ID.
     *
     * @param id ID do usuário (extraído da URL pelo @PathVariable)
     * @return ResponseEntity com o usuário encontrado
     * @PathVariable: vincula o parâmetro da URL ao parâmetro do método
     */
    @GetMapping(value = "/{id}")
    public ResponseEntity<Order> findById(@PathVariable Long id) {
        // Busca o usuário pelo ID
        Order obj = service.findById(id);
        // Retorna resposta HTTP 200 com o usuário no corpo
        return ResponseEntity.ok().body(obj);
    }

    @DeleteMapping(value = "/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/{id}")
    public ResponseEntity<Order> update(@PathVariable Long id, @RequestBody Order obj) {
        obj = service.update(id, obj);
        return ResponseEntity.ok().body(obj);
    }

}

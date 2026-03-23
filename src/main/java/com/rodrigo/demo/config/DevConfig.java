package com.rodrigo.demo.config;

import com.rodrigo.demo.entities.*;
import com.rodrigo.demo.entities.enums.OrderStatus;
import com.rodrigo.demo.entities.enums.UserRole;
import com.rodrigo.demo.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Arrays;

/**
 * CONFIGURATION - Configuração de Perfil de Teste (Database Seeding)
 * <p>
 * Esta classe configura dados iniciais para o perfil "test".
 * É uma forma de popular o banco de dados com dados de teste.
 * <p>
 * Anotações:
 * - @Configuration: marca a classe como classe de configuração do Spring
 * - @Profile("test"): esta configuração só é ativada quando o perfil "test" está ativo
 * Definido em application.properties: spring.profiles.active=test
 * <p>
 * CommandLineRunner:
 * - Interface funcional que executa código após a aplicação iniciar
 * - O método run() é executado automaticamente pelo Spring Boot
 * - Útil para inicialização de dados, warmup de cache, etc.
 * <p>
 * Fluxo de execução:
 * 1. Spring Boot inicia a aplicação
 * 2. Detecta perfil ativo = "test"
 * 3. Cria bean TestConfig (por causa do @Profile("test"))
 * 4. Executa o método run() após a inicialização completa
 * 5. Dados são inseridos no banco H2 em memória
 */
@Configuration
@Profile("dev")
public class DevConfig implements CommandLineRunner {

    /**
     * Repository injetado para persistir os dados de teste.
     */
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderItemRepository orderItemRepository;

    /**
     * Método executado automaticamente na inicialização.
     * Cria usuários de teste e persiste no banco.
     *
     * @param args argumentos de linha de comando (geralmente não utilizados)
     * @throws Exception pode lançar exceção em caso de erro
     */
    @Override
    public void run(String... args) throws Exception {

        /*Category cat1 = new Category(null, "Electronics");
        Category cat2 = new Category(null, "Books");
        Category cat3 = new Category(null, "Computers");
        Category cat4 = new Category(null, "Fashion");

        Product p1 = new Product(null, "The Lord of the Rings", "Lorem ipsum dolor sit amet, consectetur.", 90.5, "");
        Product p2 = new Product(null, "Smart TV", "Nulla eu imperdiet purus. Maecenas ante.", 2190.0, "");
        Product p3 = new Product(null, "Macbook Pro", "Nam eleifend maximus tortor, at mollis.", 1250.0, "");
        Product p4 = new Product(null, "PC Gamer", "Donec aliquet odio ac rhoncus cursus.", 1200.0, "");
        Product p5 = new Product(null, "Rails for Dummies", "Cras fringilla convallis sem vel faucibus.", 100.99, "");

        categoryRepository.saveAll(Arrays.asList(cat1, cat2, cat3, cat4));
        productRepository.saveAll(Arrays.asList(p1, p2, p3, p4, p5));

        p1.getCategories().add(cat2);
        p2.getCategories().add(cat1);
        p2.getCategories().add(cat3);
        p3.getCategories().add(cat3);
        p4.getCategories().add(cat3);
        p5.getCategories().add(cat2);
        productRepository.saveAll(Arrays.asList(p1, p2, p3, p4, p5));

        // Cria objetos User com ID null (será gerado pelo banco)
        User u1 = new User(null, "Maria Brown", "maria@gmail.com", "988888888", new BCryptPasswordEncoder().encode("123456"), UserRole.ADMIN);
        User u2 = new User(null, "Alex Green", "alex@gmail.com", "977777777", new BCryptPasswordEncoder().encode("123456"), UserRole.USER);

        System.out.println(new BCryptPasswordEncoder().encode("123456"));


        Order o1 = new Order(null, Instant.parse("2019-06-20T19:53:07Z"), OrderStatus.PAID, u1);
        Order o2 = new Order(null, Instant.parse("2019-07-21T03:42:10Z"), OrderStatus.WAITING_PAYMENT, u2);
        Order o3 = new Order(null, Instant.parse("2019-07-22T15:21:22Z"), OrderStatus.WAITING_PAYMENT, u1);

        userRepository.saveAll(Arrays.asList(u1, u2));
        orderRepository.saveAll(Arrays.asList(o1, o2, o3));

        OrderItem oi1 = new OrderItem(o1, p1, 2, p1.getPrice());
        OrderItem oi2 = new OrderItem(o1, p3, 1, p3.getPrice());
        OrderItem oi3 = new OrderItem(o2, p3, 2, p3.getPrice());
        OrderItem oi4 = new OrderItem(o3, p5, 2, p5.getPrice());

        orderItemRepository.saveAll(Arrays.asList(oi1, oi2, oi3, oi4));

        Payment pay1 = new Payment(Instant.parse("2019-06-20T21:53:07Z"), null, o1);
        o1.setPayment(pay1);

        orderRepository.save(o1);


        // saveAll: persiste múltiplas entidades de uma vez
        // Mais eficiente que múltiplos save() individuais*/

    }
}


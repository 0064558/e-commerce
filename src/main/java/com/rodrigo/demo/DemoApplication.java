package com.rodrigo.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Classe principal da aplicação Spring Boot.
 *
 * @SpringBootApplication é uma anotação de conveniência que combina:
 * - @Configuration: marca a classe como fonte de definições de beans
 * - @EnableAutoConfiguration: ativa a configuração automática do Spring Boot
 * - @ComponentScan: escaneia componentes no pacote atual e subpacotes
 *
 * O Spring Boot inicializa o container Tomcat embedded e configura
 * automaticamente os beans necessários baseado nas dependências do classpath.
 */
@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		// SpringApplication.run inicializa a aplicação Spring
		// Retorna o ApplicationContext com todos os beans configurados
		SpringApplication.run(DemoApplication.class, args);
	}

}

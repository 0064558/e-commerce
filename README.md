# 🛍️ Nexus Store (E-commerce Backend API Spring Boot + Painel Admin + Frontend React)

API REST completa para um **e-commerce** com **Spring Boot**, **Spring Security (JWT)** e **Spring Data JPA**, incluindo um **painel administrativo web** (arquivos estáticos servidos pelo próprio backend) e um **frontend em React/Vite** separado na pasta `frontend/`.

> Objetivo deste repositório: servir como projeto de portfólio demonstrando autenticação/roles, modelagem JPA com relacionamentos, boas práticas de API REST, configuração por profiles e deploy via Docker.

---

## ✨ Destaques

- **Auth JWT** (login por email/senha) + **controle de acesso por roles** (ADMIN/USER)
- **CRUD** de Usuários, Produtos, Categorias e Pedidos
- Entidades de e-commerce com relacionamentos (Order, OrderItem, Payment, Cart, Address etc.)
- **Seed de dados** por profile (classes `DevConfig` e `TestConfig`)
- **Painel Admin** simples em `/` (HTML/CSS/JS em `src/main/resources/static`)
- **Frontend React/Vite** em `frontend/` (não é empacotado automaticamente no backend)
- **CORS liberado** (útil para desenvolvimento e integração com front)
- **Dockerfile** pronto para build e execução

---

## 🧰 Tech Stack

### Backend
- **Java**: 21 (projeto configurado em `pom.xml`)
- **Spring Boot**: 4.0.3
- **Spring Web (MVC)**
- **Spring Data JPA / Hibernate**
- **Spring Security** (stateless) + **JWT** (`com.auth0:java-jwt`)
- **Validação**: Jakarta Validation

### Banco de dados (por profile)
- `test`: **H2 em memória** (console em `/h2-console`)
- `dev`: **PostgreSQL local** (configurado em `application-dev.properties`)

> Observação: o `pom.xml` também possui driver **MySQL** em runtime. Se você quiser usar MySQL no `dev`, é só trocar a URL/usuário/senha do profile `dev`.

### Frontend
- `src/main/resources/static`: **Painel Admin** (HTML/CSS/JS) servido pelo backend
- `frontend/`: **Vite + React/TS** (app separado)

---

## 🗂 Estrutura do projeto

### Backend

```
src/main/java/com/rodrigo/demo/
├── config/                 # Configs e seed de dados por profile
├── entities/               # Entidades JPA + enums + DTOs (records)
├── infra/security/         # JWT, filtros, handlers (401/403)
├── repositories/           # Repositórios Spring Data
├── resources/              # Controllers REST
├── services/               # Regras de negócio
└── DemoApplication.java
```

### Painel Admin (estático)

```
src/main/resources/static/
├── index.html
├── css/style.css
└── js/app.js
```

### Frontend (Vite)

```
frontend/
└── src/
    ├── pages/
    ├── components/
    └── services/api.ts
```

---

## 🧩 Funcionalidades (visão de produto)

### 🔐 Autenticação e autorização
- `POST /auth/login`: autentica e retorna **JWT**
- `GET /auth/me`: retorna o usuário autenticado
- `POST /auth/register`: cria um usuário (no código atual está **permitAll**; pode ser travado com ADMIN)

**Roles**:
- `ADMIN`: acesso total aos endpoints administrativos (ex.: `/users/**`, escrita em `/products`, `/categories`, `/orders`)
- `USER`: acesso a endpoints autenticados (ex.: carrinho, endereços, checkout; e `GET /orders/me`)

### 🛒 Catálogo
- Produtos e categorias com endpoints públicos para listagem/busca (GET)
- Escrita (POST/PUT/DELETE) restrita a ADMIN

### 📦 Pedidos
- Endpoints administrativos de pedidos restritos a ADMIN
- Endpoint `GET /orders/me` para o usuário autenticado consultar os próprios pedidos

### 🧾 Painel Admin
- Uma SPA simples em JavaScript que:
  - faz login
  - salva token no `localStorage`
  - consome a API com `Authorization: Bearer <token>`
  - exibe e manipula recursos (CRUD básico)

---

## 🔐 Como a segurança funciona (resumo técnico)

- A aplicação é **stateless** (`SessionCreationPolicy.STATELESS`)
- O filtro `SecurityFilter`:
  1. lê o header `Authorization`
  2. valida o JWT
  3. carrega o usuário pelo email (`UserRepository.findByEmail`)
  4. seta o `SecurityContext`

- Tratamento de erros:
  - **401**: `AuthEntryPoint` (retorna JSON: "Token ausente ou inválido")
  - **403**: `AuthAccessDeniedHandler` (retorna JSON: "Acesso negado")

---

## ⚙️ Configuração por profiles

O profile padrão está em `application.properties`:

- `spring.profiles.active=dev`

### `dev` (PostgreSQL local)
Arquivo: `src/main/resources/application-dev.properties`
- `spring.datasource.url=jdbc:postgresql://localhost:5432/demo`
- `spring.jpa.hibernate.ddl-auto=update`

### `test` (H2 em memória)
Arquivo: `src/main/resources/application-test.properties`
- `jdbc:h2:mem:testdb`
- Console: `http://localhost:8080/h2-console`

---

## 🔑 Variáveis de ambiente

### JWT
No `application.properties` existe:

- `api.security.token.secret=${JWT_SECRET:dev-jwt-change-me}`

Ou seja:
- se você setar `JWT_SECRET`, ele será usado
- se não setar, cai no default de desenvolvimento `dev-jwt-change-me`

> Em produção, sempre defina `JWT_SECRET`.

### Segredos locais sem versionar
O projeto importa automaticamente um arquivo opcional na raiz:

- `local-secrets.properties` (ignorado pelo git)

Use `local-secrets.properties.example` como base e preencha, por exemplo:

- `DB_PASSWORD`
- `ABACATEPAY_API_KEY`
- `ABACATEPAY_WEBHOOK_SECRET`
- `JWT_SECRET`

### Arquivos .env para frontend/local
Versione apenas arquivos de exemplo:

- `.env.example`
- `frontend/.env.example`

Arquivos reais (`.env`, `.env.local`, `frontend/.env`, `frontend/.env.local`) ficam ignorados no git.

---

## 🚀 Rodando o projeto (desenvolvimento)

### Pré-requisitos
- Java 21+
- Maven 3.8+
- PostgreSQL (para profile `dev`) **ou** usar `test` com H2

### Painel Admin
Depois de iniciar o backend, o painel fica em:
- `http://localhost:8080/`

---

## 🧪 Dados iniciais (seed)

Existem duas classes para seed:
- `DevConfig` (ativa em `@Profile("dev")`)
- `TestConfig` (ativa em `@Profile("test")`)

Elas têm exemplos de criação de usuário ADMIN/USER e também pedidos/produtos etc.

> Importante: no estado atual do código, o conteúdo do método `run()` dessas classes está comentado. Se você quiser seed automático, descomente o bloco.

---

## 📡 Principais endpoints

### Auth
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`

### Usuários (ADMIN)
- `GET /users`
- `GET /users/{id}`
- `POST /users` (se existir no controller)
- `PUT /users/{id}`
- `DELETE /users/{id}`

### Produtos
- `GET /products` (público)
- `GET /products/{id}` (público)
- `POST /products` (ADMIN)
- `PUT /products/{id}` (ADMIN)
- `DELETE /products/{id}` (ADMIN)

### Categorias
- `GET /categories` (público)
- `GET /categories/{id}` (público)
- `POST /categories` (ADMIN)
- `PUT /categories/{id}` (ADMIN)
- `DELETE /categories/{id}` (ADMIN)

### Pedidos
- `GET /orders/me` (autenticado)
- `GET /orders/**` (ADMIN)

---

## 🐳 Docker

Existe um `Dockerfile` com build multi-stage (Maven → JRE) que:
- compila o projeto
- empacota o `.jar`
- executa com `java -jar`

---

## 🧯 Troubleshooting (problemas comuns)

### 401 com `{"message":"Token ausente ou inválido"}`
Isso significa que você chamou um endpoint protegido sem:
- enviar `Authorization: Bearer <token>`

Ou o token:
- expirou
- está inválido

### "Encoded password does not look like BCrypt"
Se você inseriu usuário manualmente no banco com senha em texto puro, o Spring Security vai rejeitar.

✅ Solução: sempre salvar a senha **já com BCrypt**, ou criar usuário pela API (endpoint `/auth/register`).

### Banco no `dev` não conecta
Se aparecer erro do tipo `Access denied for user...`:
- confira usuário/senha em `application-dev.properties`
- confira se o banco `demo` existe

### "Cannot load driver class: org.h2.Driver"
Acontece quando você roda com profile `test` mas o H2 não está no classpath (ou se o build excluiu a dependência).

Neste projeto o H2 está no `pom.xml` como runtime, então isso geralmente indica profile/config incorreto.

---

## 🗺 Roadmap (ideias de evolução)

- Integrar build do `frontend/` no Maven e servir build pelo backend
- Documentar API com Swagger/OpenAPI
- Criar pipeline CI (testes + build de imagem Docker)
- Melhorar regras de autorização (ex.: `POST /auth/register` apenas ADMIN)
- Refresh token / logout server-side

---

## 👨‍💻 Autor

**Rodrigo Alexandre**
- Email: rodrigo11.vgp@gmail.com

---

## 📄 Licença

Este projeto está sob a licença MIT.

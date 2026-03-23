# 🛍️ Shop Admin API

> Uma API RESTful completa para gerenciamento de e-commerce com autenticação JWT, controle de roles e painel administrativo integrado.

![Java](https://img.shields.io/badge/Java-21-orange?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0.3-green?style=flat-square)
![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## 📋 Tabela de Conteúdos

- [Sobre o Projeto](#sobre-o-projeto)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Arquitetura](#-arquitetura)
- [Primeiros Passos](#-primeiros-passos)
- [API Endpoints](#-api-endpoints)
- [Autenticação](#-autenticação)
- [Deploy](#-deploy)
- [Contribuindo](#-contribuindo)

---

## 📖 Sobre o Projeto

**Shop Admin API** é uma API REST robusta construída com **Spring Boot 4** para gerenciar completamente um e-commerce. A aplicação oferece:

✅ **Autenticação JWT** com roles (ADMIN/USER)  
✅ **Painel administrativo** em tempo real com interface web  
✅ **Gestão completa** de usuários, produtos, categorias e pedidos  
✅ **Segurança** com Spring Security e BCrypt  
✅ **Banco de dados** flexível (H2, MySQL, PostgreSQL)   

---

## ⚡ Features

### 🔐 Autenticação e Autorização
- Login com email/senha
- Geração de JWT com expiração configurável
- Controle de acesso baseado em roles
- Registro de novos usuários (apenas admin)

### 👥 Gestão de Usuários
- CRUD completo de usuários
- Atribuição de roles (ADMIN/USER)
- Dados criptografados com BCrypt
- Validação de email único

### 📦 Gestão de Produtos
- CRUD de produtos com preço e descrição
- Associação de múltiplas categorias
- URL de imagem configurável
- Filtros e listagens

### 📂 Categorias
- CRUD de categorias
- Relacionamento many-to-many com produtos
- Organização hierárquica

### 🛒 Pedidos
- CRUD de pedidos com status
- Rastreamento de itens do pedido
- Cálculo automático de totais
- Status do pedido (WAITING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELED)

### 💳 Pagamentos
- Registro de pagamentos associados a pedidos
- Rastreamento de datas

### 📊 Painel Administrativo
- Interface web integrada
- Dashboard em tempo real
- Visualização de todas as entidades
- Operações CRUD direto no painel

---

## 🛠 Tech Stack

### Backend
- **Framework**: Spring Boot 4.0.3
- **Java**: 21
- **ORM**: Spring Data JPA + Hibernate
- **Segurança**: Spring Security + JWT (Auth0)
- **Validação**: Jakarta Validation
- **Criptografia**: BCrypt

### Banco de Dados
- **Teste**: H2 Database (em memória)
- **Desenvolvimento**: PostgreSQL

### Infraestrutura
- **Build**: Maven
- **Container**: Docker
- **Web**: Embedded Tomcat

### Frontend (Painel Admin)
- HTML5 + CSS3 + JavaScript
- Fetch API
- LocalStorage para persistência de token

---

## 🏗 Arquitetura

### Estrutura de Camadas

```
src/main/java/com/rodrigo/demo/
├── config/              # Configurações (profiles: dev, test, prod)
├── entities/            # Modelos JPA
│   ├── pk/              # Chaves primárias compostas
│   ├── records/         # DTOs imutáveis
│   ├── enums/           # Enums (OrderStatus, UserRole)
│   ├── User             
│   ├── Product
│   ├── Category
│   ├── Order
│   ├── OrderItem
│   ├── Payment
│   
├── repositories/        # Acesso a dados (Spring Data JPA)
├── services/            # Lógica de negócio
├── resources/           # Controllers REST
├── infra/
│   └── security/        # JWT, BCrypt, Filters
└── DemoApplication.java # Classe principal
```

### Modelo de Dados

```
User (1) ──────────────── (n) Order
  ├─ id                        ├─ id
  ├─ name                      ├─ moment
  ├─ email (unique)            ├─ orderStatus
  ├─ phone                     └─ (1) ──── (1) Payment
  ├─ password (hashed)
  └─ role (ADMIN/USER)

Product (n) ────────── (n) OrderItem ────────── (1) Order

Category (n) ────────────────── (n) Product
```

---

## 🚀 Primeiros Passos

### Pré-requisitos
- Java 21+
- Maven 3.8+
- PostgreSQL 
- Git

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/shop-admin-api.git
cd shop-admin-api
```

2. **Configure o banco (PostgreSQL local)**
```bash
# Crie o banco de dados
createdb demo
# Atualize as credenciais em src/main/resources/application-dev.properties
spring.datasource.url=jdbc:postgresql://localhost:5432/shopdb
spring.datasource.username=seu_usuario
spring.datasource.password=sua_senha
```

3. **Instale dependências e execute**
```bash
# Modo desenvolvimento (PostgreSQL local)
mvn clean install
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run

# Modo teste (H2 em memória)
SPRING_PROFILES_ACTIVE=test mvn spring-boot:run
```

4. **Acesse a aplicação**
- **Painel Admin**: http://localhost:8080

### Primeiras Credenciais (Modo Test)
Quando a aplicação inicia com perfil `test` ou `dev`, dois usuários são criados automaticamente:

```
Admin:
Email: maria@gmail.com
Senha: 123456
Role: ADMIN

Usuário:
Email: alex@gmail.com
Senha: 123456
Role: USER
```

---

## 📡 API Endpoints

### 🔑 Autenticação

```http
POST /auth/login
Content-Type: application/json

{
  "email": "maria@gmail.com",
  "password": "123456"
}

Response: 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```http
POST /auth/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Novo Usuário",
  "email": "novo@email.com",
  "phone": "11999999999",
  "password": "senha123",
  "role": "USER"
}

Response: 200 OK
```

### 👥 Usuários (Requer ADMIN)

```http
GET /users                          # Listar todos
GET /users/:id                      # Buscar por ID
PUT /users/:id                      # Atualizar
DELETE /users/:id                   # Deletar

Authorization: Bearer <token>
```

### 📦 Produtos (GET público, POST/PUT/DELETE requer ADMIN)

```http
GET /products                       # Listar (público)
GET /products/:id                   # Buscar (público)
POST /products                      # Criar (admin)
PUT /products/:id                   # Atualizar (admin)
DELETE /products/:id                # Deletar (admin)

Content-Type: application/json
{
  "name": "Macbook Pro",
  "description": "Laptop poderoso",
  "price": 1250.00,
  "imgUrl": "https://..."
}
```

### 📂 Categorias (GET público, POST/PUT/DELETE requer ADMIN)

```http
GET /categories                     # Listar (público)
GET /categories/:id                 # Buscar (público)
POST /categories                    # Criar (admin)
PUT /categories/:id                 # Atualizar (admin)
DELETE /categories/:id              # Deletar (admin)

Content-Type: application/json
{
  "name": "Eletrônicos"
}
```

### 🛒 Pedidos (Requer ADMIN)

```http
GET /orders                         # Listar
GET /orders/:id                     # Buscar
PUT /orders/:id                     # Atualizar status
DELETE /orders/:id                  # Deletar

Authorization: Bearer <token>
Content-Type: application/json
{
  "orderStatus": "PAID"
}
```

---

## 🔐 Autenticação

### Fluxo JWT

1. **Login** → Envia email/senha → Recebe token JWT
2. **Requisições** → Inclui `Authorization: Bearer <token>` no header
3. **Validação** → Servidor valida JWT e autoriza conforme role
4. **Expiração** → Token expira em 2 horas (configurável)

### Exemplo de requisição com autenticação

```bash
curl -X GET http://localhost:8080/users \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

### Roles e Permissões

| Endpoint | PUBLIC | USER | ADMIN |
|----------|--------|------|-------|
| GET /products | ✅ | ✅ | ✅ |
| POST /products | ❌ | ❌ | ✅ |
| GET /users | ❌ | ❌ | ✅ |
| POST /auth/register | ❌ | ❌ | ✅ |

---
## 🐛 Troubleshooting

### "Access denied for user 'root'@'localhost'"
Verifique as credenciais no banco de dados em `application-dev.properties`:
```properties
spring.datasource.username=root
spring.datasource.password=sua_senha_correta
```

### "Cannot load driver class: org.h2.Driver"
Certifique-se que o perfil ativo é `test` e H2 está nas dependências:
```bash
SPRING_PROFILES_ACTIVE=test mvn spring-boot:run
```

### "Token inválido" no painel
O token JWT expira em 2 horas. Faça login novamente para obter um novo token.



---

# Observações
- O projeto é modular e pode ser facilmente estendido com novas features (ex: integração com gateways de pagamento, envio de emails, etc).
- O painel administrativo é simples, mas funcional, e pode ser melhorado com frameworks frontend (React, Angular, etc) para uma experiência mais rica.
- A segurança é uma prioridade, com criptografia de senhas e controle de acesso rigoroso baseado em roles.
- O código é organizado em camadas, seguindo boas práticas de desenvolvimento e arquitetura limpa, facilitando manutenção e escalabilidade.
- Ao rodar o projeto uma vez no ambiente de desenvolvimento, os dados são inseridos automaticamente, quando isso for feito e for rodar a aplicação novamente, é necessário que comente o conteúdo de `DevConfig`, para que os dados no banco não sejam duplicados e não dê erro na aplicação.

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.



---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adicionar MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

---

## 👨‍💻 Autor

**Rodrigo Alexandre**
- Email: rodrigo11.vgp@gmail.com


---

## 📞 Suporte

Encontrou um bug ou tem uma sugestão? Abra uma [Issue](https://github.com/seu-usuario/shop-admin-api/issues).

---

<div align="center">

**⭐ Se este projeto foi útil para você, considere dar uma estrela!**

Made with ❤️ by Rodrigo Alexandre

</div>


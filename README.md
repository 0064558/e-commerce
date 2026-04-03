# NEXUS STORE

Projeto full stack de e-commerce com:

- Backend em Spring Boot (API REST, JWT, JPA, webhook de pagamento)
- Frontend React (loja para usuario final)
- Painel admin estatico servido pelo backend
- Integracao de pagamento com AbacatePay
- Integracao de frete com Melhor Envio (OAuth) com fallback local

O objetivo deste repositorio e demonstrar um fluxo completo de compra: autenticacao, catalogo, carrinho, checkout com frete, pagamento, confirmacao e historico de pedidos.

## Sumario

1. [Visao Geral](#visao-geral)
2. [Funcionalidades Do Site](#funcionalidades-do-site)
3. [Funcionalidades Do Backend](#funcionalidades-do-backend)
4. [Stack E Integracoes](#stack-e-integracoes)
5. [Estrutura Do Projeto](#estrutura-do-projeto)
6. [Como Rodar Localmente](#como-rodar-localmente)
7. [Configuracao De Ambiente](#configuracao-de-ambiente)
8. [Fluxo Melhor Envio OAuth](#fluxo-melhor-envio-oauth)
9. [Principais Endpoints](#principais-endpoints)
10. [Docker](#docker)
11. [Estado Atual E Limitacoes](#estado-atual-e-limitacoes)

## Visao Geral

A aplicacao possui dois frontends:

- Loja React em `frontend/` para o usuario final
- Painel admin estatico em `src/main/resources/static/`

E um backend unico que:

- Expoe endpoints REST para autenticacao, catalogo, carrinho, enderecos, checkout e pedidos
- Aplica seguranca baseada em JWT e roles (USER/ADMIN)
- Cria cobranca no AbacatePay e processa webhook de status
- Calcula frete via Melhor Envio quando conectado, com fallback para simulacao local quando necessario

## Funcionalidades Do Site

### 1) Login, cadastro e sessao

- Login com email/senha
- Cadastro com nome, email, telefone, CPF e senha
- Validacao de CPF no frontend e backend
- Persistencia de token por aba via `sessionStorage`
- Logout automatico quando token expira/invalida

### 2) Catalogo de produtos

- Listagem de produtos e categorias
- Busca por nome/descricao
- Filtro por categoria
- Filtro por faixa de preco
- Ordenacao por relevancia, nome e preco
- Paginacao
- Cards de destaque
- Modal de visao rapida
- Navegacao para pagina de detalhes

### 3) Pagina de detalhes do produto

- Exibe imagem, preco, descricao, estoque e categorias
- Controle de quantidade com limite de estoque
- Adicao ao carrinho com feedback visual
- Produtos relacionados por categoria

### 4) Carrinho lateral

- Abertura rapida pelo navbar
- Listagem de itens, subtotal por item e total do carrinho
- Incremento/decremento de quantidade
- Remocao de item
- Limpeza completa do carrinho
- Acao para seguir ao checkout

### 5) Enderecos (minha conta)

- Listar enderecos do usuario
- Cadastrar endereco
- Definir endereco padrao
- Remover endereco
- Busca de CEP com ViaCEP para auto preenchimento de logradouro/bairro/cidade/UF

### 6) Checkout com frete e pagamento

- Selecao de endereco de entrega
- Cadastro de novo endereco sem sair do checkout
- Cotacao de frete por CEP
  - Fonte `api` quando Melhor Envio retorna opcoes
  - Fonte `simulado` quando API externa nao estiver disponivel
- Escolha de opcao de frete (ex.: PAC/SEDEX)
- Resumo com subtotal de produtos, frete e total estimado
- Confirmacao cria/atualiza cobranca e redireciona para checkout AbacatePay

### 7) Sucesso e status do pedido

- Pagina de sucesso carrega pedido por `externalId` quando necessario
- Exibe status atual, itens, subtotal de produtos, frete e total final
- Mostra alertas de pagamento aprovado ou em processamento
- Acao para voltar a comprar ou abrir pagina de pedidos

### 8) Pedidos

- Usuario USER ve apenas os proprios pedidos
- Usuario ADMIN ve todos os pedidos
- Exibicao de status, itens, endereco, frete e total
- Modal com detalhes completos do pedido
- Botao `Pagar agora` para pedidos em `WAITING_PAYMENT` com checkoutUrl
- Atualizacao de link de pagamento quando necessario para preservar frete escolhido

### 9) Perfil

- Atualizacao de dados pessoais (nome, email, telefone, CPF)
- Troca de senha com validacao de confirmacao

### 10) Conteudo institucional

- Hub institucional com paginas:
  - Sobre nos
  - Politica de devolucao
  - Frete e entrega
  - Seguranca

## Funcionalidades Do Backend

### 1) Seguranca

- Autenticacao JWT stateless
- Controle de acesso por role
- Tratamento padrao de 401/403
- Regras principais:
  - Publico: login, cadastro, callback OAuth de frete, webhook AbacatePay, recursos estaticos
  - USER autenticado: carrinho, enderecos, checkout, `/orders/me`, atualizacao do proprio usuario
  - ADMIN: gestao de usuarios, pedidos, produtos e categorias

### 2) Checkout e consistencia de pedido

- Cria pedido a partir do carrinho e endereco selecionado
- Reaproveita pedido pendente quando carrinho e endereco continuam equivalentes
- Cancela pedido pendente anterior quando carrinho muda
- Persiste `shippingAmount` e `shippingLabel` no pedido
- Regera `externalId` e checkout quando frete muda para evitar link antigo de pagamento

### 3) Pagamento (AbacatePay)

- Criacao de cobranca com metodos PIX e CARD
- Envio dos itens do pedido para cobranca
- Inclusao do frete como item separado quando maior que zero
- Uso de `returnUrl` e `completionUrl` com `externalId`
- Armazenamento de `billingId` e `checkoutUrl` no pedido

### 4) Webhook de pagamento

- Endpoint recebe notificacoes AbacatePay
- Validacao opcional de segredo de webhook (query/header)
- Resolucao do pedido por `orderId`, `externalId` ou `billingId`
- Atualiza status:
  - `PAID` aprova pagamento, valida estoque no momento da confirmacao e baixa estoque
  - `FAILED`/`CANCELED` cancela pedido
  - `WAITING_PAYMENT`/`PENDING` mantem pendente
- Limpa carrinho do cliente ao confirmar pagamento

### 5) Frete (Melhor Envio + fallback)

- Endpoint de cotacao: `POST /shipping/quote`
- Se houver token valido Melhor Envio, usa API real
- Se nao houver token ou ocorrer falha, usa simulacao local
- OAuth de conexao com Melhor Envio:
  - gerar URL de autorizacao
  - receber callback
  - trocar `code` por token
  - consultar status de conexao

## Stack E Integracoes

### Backend

- Java 21
- Spring Boot
- Spring Web
- Spring Data JPA
- Spring Security
- Jakarta Validation
- JWT (`com.auth0:java-jwt`)
- PostgreSQL (dev)
- H2 (test)

### Frontend

- React 18
- React Router DOM 6
- React Scripts 5

### Integracoes externas

- AbacatePay (checkout e webhook)
- Melhor Envio (cotacao e OAuth)
- ViaCEP (autopreenchimento de endereco)
- OpenStreetMap/Nominatim (estimativa de distancia para frete simulado)

## Estrutura Do Projeto

```text
.
|-- src/main/java/com/rodrigo/demo
|   |-- config
|   |-- entities
|   |-- infra/security
|   |-- repositories
|   |-- resources
|   `-- services
|-- src/main/resources
|   |-- application.properties
|   |-- application-dev.properties
|   |-- application-test.properties
|   `-- static
|       |-- index.html
|       |-- css/style.css
|       `-- js/app.js
|-- frontend
|   |-- src/components
|   |-- src/pages
|   |-- src/services/api.js
|   `-- package.json
|-- local-secrets.properties.example
|-- .env.example
`-- Dockerfile
```

## Como Rodar Localmente

### 1) Backend

Requisitos:

- Java 21+
- Banco PostgreSQL rodando (para profile `dev`)

Passos:

```bash
./mvnw spring-boot:run
```

No Windows:

```bash
mvnw.cmd spring-boot:run
```

Backend em: `http://localhost:8080`

### 2) Frontend React

```bash
cd frontend
npm install
npm start
```

Frontend em: `http://localhost:3000`

### 3) Painel admin estatico

Com backend ligado, acessar:

`http://localhost:8080/`

O painel exige login ADMIN.

## Configuracao De Ambiente

### Arquivo local de segredos (backend)

Copie o exemplo:

```bash
cp local-secrets.properties.example local-secrets.properties
```

No Windows PowerShell:

```powershell
Copy-Item local-secrets.properties.example local-secrets.properties
```

Preencha os valores reais em `local-secrets.properties` (arquivo ignorado pelo git), por exemplo:

- `JWT_SECRET`
- `DB_PASSWORD`
- `ABACATEPAY_API_KEY`
- `ABACATEPAY_WEBHOOK_SECRET`
- `MELHOR_ENVIO_CLIENT_ID`
- `MELHOR_ENVIO_CLIENT_SECRET`
- `MELHOR_ENVIO_REDIRECT_URI`
- `MELHOR_ENVIO_BASE_URL`
- `MELHOR_ENVIO_USER_AGENT`

### Frontend

Use `frontend/.env.example` como base para `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8080
```

Observacao:

- Existe tambem `.env.example` na raiz para referencia de ambiente local.
- Arquivos reais de ambiente (`.env`, `.env.local`, `frontend/.env`, `frontend/.env.local`) devem permanecer nao versionados.

## Fluxo Melhor Envio OAuth

1. Configure `MELHOR_ENVIO_CLIENT_ID`, `MELHOR_ENVIO_CLIENT_SECRET` e `MELHOR_ENVIO_REDIRECT_URI`.
2. Gere URL de autorizacao via `GET /shipping/oauth/authorize`.
3. Abra a URL retornada e conclua autorizacao na Melhor Envio.
4. A Melhor Envio redireciona para callback (`/shipping/oauth/callback`).
5. Verifique conexao em `GET /shipping/oauth/status`.

Observacao importante para localhost:

- A callback deve ser publica e bater exatamente com a URI cadastrada no app Melhor Envio.
- Em ambiente local, normalmente usa-se um tunel (ex.: ngrok) para expor o callback.

## Principais Endpoints

### Auth

- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`

### Usuarios

- `GET /users` (ADMIN)
- `GET /users/{id}` (ADMIN)
- `PUT /users/{id}` (ADMIN ou proprio usuario)
- `PUT /users/me/password` (autenticado)
- `DELETE /users/{id}` (ADMIN)

### Catalogo

- `GET /products`
- `GET /products/{id}`
- `POST /products` (ADMIN)
- `PUT /products/{id}` (ADMIN)
- `DELETE /products/{id}` (ADMIN)
- `GET /categories`
- `GET /categories/{id}`
- `POST /categories` (ADMIN)
- `PUT /categories/{id}` (ADMIN)
- `DELETE /categories/{id}` (ADMIN)

### Carrinho

- `GET /cart`
- `POST /cart/items?productId={id}&quantity={qtd}`
- `PUT /cart/items/{productId}?quantity={qtd}`
- `DELETE /cart/items/{productId}`
- `DELETE /cart`

### Enderecos

- `GET /addresses`
- `GET /addresses/{id}`
- `POST /addresses`
- `PUT /addresses/{id}`
- `PATCH /addresses/{id}/default`
- `DELETE /addresses/{id}`

### Checkout, pedidos, frete e webhook

- `POST /checkout`
- `GET /orders` (ADMIN)
- `GET /orders/me`
- `GET /orders/{id}` (ADMIN)
- `PUT /orders/{id}` (ADMIN)
- `DELETE /orders/{id}` (ADMIN)
- `POST /shipping/quote`
- `GET /shipping/oauth/authorize`
- `GET /shipping/oauth/callback`
- `GET /shipping/oauth/status`
- `POST /webhooks/abacatepay`

## Docker

Build da imagem:

```bash
docker build -t nexus-store .
```

Execucao:

```bash
docker run --rm -p 8080:8080 --env-file .env nexus-store
```

Se preferir, injete as variaveis necessarias diretamente no comando `docker run`.

## Estado Atual E Limitacoes

- O fluxo principal de compra esta funcional: login, catalogo, carrinho, checkout com frete, pagamento e pedido.
- A cotacao de frete depende de credenciais OAuth validas da Melhor Envio para usar API real.
- Sem token valido, o sistema continua operando com estimativa local de frete.
- O frontend de loja nao possui tela dedicada para CRUD de produtos/categorias (isso existe no painel admin estatico e via API).
- Ainda nao ha pipeline CI/CD versionada no repositorio.

---

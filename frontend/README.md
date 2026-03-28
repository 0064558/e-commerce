# NEXUS STORE - E-Commerce Frontend

Frontend em React para a plataforma de e-commerce NEXUS STORE.

## Estrutura do Projeto

```
front/
├── public/
│   └── index.html
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Navbar.jsx
│   │   ├── Navbar.css
│   │   ├── CartDrawer.jsx
│   │   ├── CartDrawer.css
│   │   ├── Alert.jsx
│   │   ├── Alert.css
│   │   ├── Spinner.jsx
│   │   └── Spinner.css
│   ├── pages/              # Páginas principais
│   │   ├── LoginPage.jsx
│   │   ├── LoginPage.css
│   │   ├── ProductsPage.jsx
│   │   ├── ProductsPage.css
│   │   ├── OrdersPage.jsx
│   │   └── OrdersPage.css
│   ├── contexts/           # React Contexts
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   └── NavContext.jsx
│   ├── services/           # Serviços (API)
│   │   └── api.js
│   ├── styles/             # Estilos globais
│   │   ├── global.css
│   │   └── forms.css
│   ├── utils/              # Utilitários
│   │   └── helpers.js
│   ├── App.jsx             # Componente principal
│   └── index.jsx           # Ponto de entrada
├── package.json
├── .env                    # Variáveis de ambiente
└── README.md
```

## Requisitos

- Node.js (v14 ou superior)
- npm ou yarn

## Instalação

1. Navegue até a pasta do projeto:
```bash
cd front
```

2. Instale as dependências:
```bash
npm install
```

## Configuração

Configure a URL da API no arquivo `.env`:

```env
REACT_APP_API_URL=http://localhost:8080
```

## Execução

Para iniciar o servidor de desenvolvimento:

```bash
npm start
```

A aplicação será aberta em `http://localhost:3000`

## Build

Para criar uma versão de produção:

```bash
npm run build
```

## Características

- ✅ Autenticação com JWT
- ✅ Catálogo de produtos com busca e filtros
- ✅ Carrinho de compras
- ✅ Histórico de pedidos
- ✅ Design moderno com tema escuro
- ✅ Totalmente responsivo

## Componentes Principais

### Navbar
Barra de navegação com links para produtos, pedidos e carrinho.

### ProductsPage
Exibe o catálogo de produtos com busca, filtros por categoria e opção de adicionar ao carrinho.

### CartDrawer
Painel lateral com o carrinho de compras, permitindo gerenciar quantidade e remover itens.

### OrdersPage
Exibe o histórico de pedidos do usuário com status e detalhes.

### LoginPage
Página de autenticação com email e senha.

## API Endpoints Utilizados

- `POST /auth/login` - Autenticação
- `GET /auth/me` - Dados do usuário logado
- `GET /products` - Lista de produtos
- `GET /categories` - Lista de categorias
- `GET /cart` - Dados do carrinho
- `POST /cart/items` - Adicionar item ao carrinho
- `PUT /cart/items/{productId}` - Atualizar item
- `DELETE /cart/items/{productId}` - Remover item
- `DELETE /cart` - Limpar carrinho
- `GET /orders/me` - Pedidos do usuário

## Estilos

O projeto utiliza um tema de cores personalizado com paleta roxa e azul. Para customizar, edite as variáveis CSS em `src/styles/global.css`.

## Licença

Todos os direitos reservados © NEXUS STORE 2026

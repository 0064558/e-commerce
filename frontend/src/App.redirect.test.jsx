import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import api from './services/api';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    setToken: jest.fn(),
    getMe: jest.fn(),
    getCart: jest.fn(),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeCartItem: jest.fn(),
    clearCart: jest.fn(),
    getProduct: jest.fn(),
  },
}));

jest.mock('./components/Navbar', () => ({
  __esModule: true,
  default: ({ onNavigate, onCartOpen }) => (
    <div>
      <button type="button" onClick={() => onNavigate('login')}>
        navbar-go-login
      </button>
      <button type="button" onClick={onCartOpen}>
        navbar-open-cart
      </button>
    </div>
  ),
}));

jest.mock('./components/CartDrawer', () => ({
  __esModule: true,
  default: ({ onCheckout }) => (
    <div>
      <div>cart-drawer</div>
      <button type="button" onClick={onCheckout}>
        drawer-checkout
      </button>
    </div>
  ),
}));

jest.mock('./components/Footer', () => ({
  __esModule: true,
  default: () => <div>footer</div>,
}));

jest.mock('./components/Alert', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./components/Spinner', () => ({
  __esModule: true,
  default: ({ text }) => <div>{text || 'loading'}</div>,
}));

jest.mock('./pages/LoginPage', () => ({
  __esModule: true,
  default: ({ onLoginSuccess }) => (
    <div>
      <div>login-page</div>
      <button
        type="button"
        onClick={() =>
          onLoginSuccess('token-teste', {
            id: 1,
            name: 'Usuario Teste',
            taxId: '12345678901',
          })
        }
      >
        mock-login-success
      </button>
    </div>
  ),
}));

jest.mock('./pages/ProductsPage', () => ({
  __esModule: true,
  default: () => <div>products-page</div>,
}));

jest.mock('./pages/ProductDetailPage', () => ({
  __esModule: true,
  default: () => <div>product-detail-page</div>,
}));

jest.mock('./pages/CheckoutPage.js', () => ({
  __esModule: true,
  default: () => <div>checkout-page</div>,
}));

jest.mock('./pages/SuccessPage.js', () => ({
  __esModule: true,
  default: () => <div>success-page</div>,
}));

jest.mock('./pages/OrdersPage', () => ({
  __esModule: true,
  default: () => <div>orders-page</div>,
}));

jest.mock('./pages/AddressesPage', () => ({
  __esModule: true,
  default: () => <div>addresses-page</div>,
}));

jest.mock('./pages/ProfilePage', () => ({
  __esModule: true,
  default: () => <div>profile-page</div>,
}));

jest.mock('./pages/InstitutionalHub', () => ({
  __esModule: true,
  default: () => <div>institutional-page</div>,
}));

jest.mock('./pages/AboutPage', () => ({
  __esModule: true,
  default: () => <div>about-page</div>,
}));

jest.mock('./pages/ReturnsPage', () => ({
  __esModule: true,
  default: () => <div>returns-page</div>,
}));

jest.mock('./pages/ShippingPage', () => ({
  __esModule: true,
  default: () => <div>shipping-page</div>,
}));

jest.mock('./pages/SecurityPage', () => ({
  __esModule: true,
  default: () => <div>security-page</div>,
}));

const renderApp = (initialRoute = '/products') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );

describe('Fluxo de redirect pos-login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();

    api.getCart.mockResolvedValue({ items: [], total: 0 });
    api.addToCart.mockResolvedValue({});
  });

  it('deve ir para products ao clicar em entrar manualmente', async () => {
    renderApp('/products');
    const user = userEvent.setup();

    expect(await screen.findByText('products-page')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'navbar-go-login' }));
    expect(await screen.findByText('login-page')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'mock-login-success' }));

    await waitFor(() => {
      expect(screen.getByText('products-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('checkout-page')).not.toBeInTheDocument();
  });

  it('deve ir para checkout apos login quando checkout foi iniciado no carrinho de visitante', async () => {
    localStorage.setItem(
      'guest_cart',
      JSON.stringify({
        items: [
          {
            productId: 10,
            productName: 'Produto Teste',
            productPrice: 25,
            quantity: 2,
          },
        ],
        total: 50,
      })
    );

    renderApp('/products');
    const user = userEvent.setup();

    expect(await screen.findByText('products-page')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'navbar-open-cart' }));
    expect(await screen.findByText('cart-drawer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'drawer-checkout' }));
    expect(await screen.findByText('login-page')).toBeInTheDocument();
    expect(sessionStorage.getItem('post_login_redirect')).toBe('/checkout');

    await user.click(screen.getByRole('button', { name: 'mock-login-success' }));

    await waitFor(() => {
      expect(screen.getByText('checkout-page')).toBeInTheDocument();
    });

    expect(api.addToCart).toHaveBeenCalledWith(10, 2);
  });
});

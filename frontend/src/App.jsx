import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import OrdersPage from './pages/OrdersPage';
import AddressesPage from './pages/AddressesPage';
import ProfilePage from './pages/ProfilePage';
import CheckoutPage from './pages/CheckoutPage.js';
import SuccessPage from './pages/SuccessPage.js';
import InstitutionalHub from './pages/InstitutionalHub';
import AboutPage from './pages/AboutPage';
import ReturnsPage from './pages/ReturnsPage';
import ShippingPage from './pages/ShippingPage';
import SecurityPage from './pages/SecurityPage';
import Alert from './components/Alert';
import Spinner from './components/Spinner';
import './styles/global.css';
import './styles/forms.css';
import './pages/CheckoutPage.css';
import './pages/OrdersPage.css';
import './styles/redesign.css';
import api from './services/api';

const GUEST_CART_KEY = 'guest_cart';
const POST_LOGIN_REDIRECT_KEY = 'post_login_redirect';
const ALLOWED_POST_LOGIN_REDIRECTS = new Set(['/checkout', '/orders', '/addresses', '/profile']);

const roundPrice = (value) => Math.round((Number(value) || 0) * 100) / 100;

const buildGuestCart = (items = []) => {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => {
      const productId = Number(item?.productId);
      const quantity = Math.max(1, Number(item?.quantity) || 1);
      const productPrice = roundPrice(item?.productPrice);

      if (!Number.isFinite(productId)) {
        return null;
      }

      return {
        productId,
        productName: item?.productName || 'Produto',
        productPrice,
        quantity,
        subTotal: roundPrice(productPrice * quantity),
      };
    })
    .filter(Boolean);

  const total = roundPrice(
    normalizedItems.reduce((sum, item) => sum + (item.subTotal || 0), 0)
  );

  return {
    items: normalizedItems,
    total,
  };
};

const readGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return buildGuestCart();
    const parsed = JSON.parse(raw);
    return buildGuestCart(parsed?.items);
  } catch {
    return buildGuestCart();
  }
};

const saveGuestCart = (cartData) => {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(buildGuestCart(cartData?.items)));
  } catch {
    // noop
  }
};

const clearGuestCart = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // noop
  }
};

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cart, setCart] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [appError, setAppError] = useState('');
  const [isAuthHydrated, setIsAuthHydrated] = useState(false);

  const loadGuestCart = useCallback(() => {
    setCart(readGuestCart());
  }, []);

  const loadServerCart = useCallback(async () => {
    try {
      setIsCartLoading(true);
      const cartData = await api.getCart();
      setCart(cartData);
    } catch (err) {
      console.error('Error loading cart:', err);
      setAppError(err.message);
    } finally {
      setIsCartLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = (event) => {
      const message = event?.detail?.message || 'Sua sessão expirou ou é inválida. Faça login novamente.';
      api.setToken(null);
      sessionStorage.removeItem('auth_token');
      sessionStorage.setItem('login_notice', message);
      setToken(null);
      setUser(null);
      setCart(readGuestCart());
      setSuccessOrder(null);
      setIsCartOpen(false);
      setAppError('');
      navigate('/products', { replace: true });
    };

    window.addEventListener('api:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('api:auth-expired', handleAuthExpired);
    };
  }, [navigate]);

  const pageByPath = {
    '/products': 'products',
    '/orders': 'orders',
    '/addresses': 'addresses',
    '/profile': 'profile',
    '/checkout': 'checkout',
    '/success': 'success',
    '/login': 'login',
    '/institucional': 'institucional',
    '/sobre': 'sobre',
    '/devolucao': 'devolucao',
    '/frete': 'frete',
    '/seguranca': 'seguranca',
  };

  const pathByPage = {
    products: '/products',
    orders: '/orders',
    addresses: '/addresses',
    profile: '/profile',
    checkout: '/checkout',
    success: '/success',
    login: '/login',
    institucional: '/institucional',
    sobre: '/sobre',
    devolucao: '/devolucao',
    frete: '/frete',
    seguranca: '/seguranca',
  };

  const currentPage = pageByPath[location.pathname] || 'products';

  // Load token from sessionStorage on mount (per tab)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('auth_token');
    if (!savedToken) {
      loadGuestCart();
      setIsAuthHydrated(true);
      return;
    }

    api.setToken(savedToken);
    setToken(savedToken);

    api
      .getMe()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        api.setToken(null);
        sessionStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setCart(readGuestCart());
        setSuccessOrder(null);
      })
      .finally(() => {
        setIsAuthHydrated(true);
      });
  }, [loadGuestCart]);

  // Load cart when user is logged in
  useEffect(() => {
    if (token) {
      loadServerCart();
    } else if (isAuthHydrated) {
      loadGuestCart();
    }
  }, [token, isAuthHydrated, loadGuestCart, loadServerCart]);

  const mergeGuestCartIntoUserCart = useCallback(async () => {
    const guestCart = readGuestCart();
    if (!guestCart.items.length) {
      return;
    }

    for (const item of guestCart.items) {
      await api.addToCart(item.productId, item.quantity);
    }

    clearGuestCart();
  }, []);

  const handleLoginSuccess = async (newToken, userData) => {
    api.setToken(newToken);
    sessionStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    setSuccessOrder(null);

    try {
      await mergeGuestCartIntoUserCart();
    } catch (err) {
      setAppError(err.message || 'Login realizado, mas não foi possível migrar seu carrinho local.');
    }

    await loadServerCart();

    let redirectPath = '/products';
    try {
      const storedRedirect = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
      if (storedRedirect && ALLOWED_POST_LOGIN_REDIRECTS.has(storedRedirect)) {
        redirectPath = storedRedirect;
      }
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    } catch {
      redirectPath = '/products';
    }

    navigate(redirectPath, { replace: true });
  };

  const handleLogout = () => {
    api.setToken(null);
    sessionStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setCart(readGuestCart());
    setSuccessOrder(null);
    navigate('/products', { replace: true });
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleAddToCart = async (productId, quantity) => {
    try {
      setAppError('');

      if (token) {
        await api.addToCart(productId, quantity);
        await loadServerCart();
        return;
      }

      const product = await api.getProduct(productId);
      const currentCart = readGuestCart();
      const existingItem = currentCart.items.find((item) => item.productId === Number(productId));
      const currentQty = existingItem?.quantity || 0;
      const nextQty = Math.max(1, currentQty + (Number(quantity) || 1));

      const nextItems = existingItem
        ? currentCart.items.map((item) =>
            item.productId === Number(productId)
              ? {
                  ...item,
                  productName: product?.name || item.productName,
                  productPrice: roundPrice(product?.price ?? item.productPrice),
                  quantity: nextQty,
                }
              : item
          )
        : [
            ...currentCart.items,
            {
              productId: Number(productId),
              productName: product?.name || 'Produto',
              productPrice: roundPrice(product?.price),
              quantity: nextQty,
            },
          ];

      const nextCart = buildGuestCart(nextItems);
      saveGuestCart(nextCart);
      setCart(nextCart);
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleUpdateCartItem = async (productId, quantity) => {
    try {
      setAppError('');

      if (token) {
        if (quantity < 1) {
          await api.removeCartItem(productId);
        } else {
          await api.updateCartItem(productId, quantity);
        }
        await loadServerCart();
        return;
      }

      const currentCart = readGuestCart();
      const nextItems = quantity < 1
        ? currentCart.items.filter((item) => item.productId !== Number(productId))
        : currentCart.items.map((item) =>
            item.productId === Number(productId)
              ? {
                  ...item,
                  quantity: Number(quantity),
                }
              : item
          );

      const nextCart = buildGuestCart(nextItems);
      saveGuestCart(nextCart);
      setCart(nextCart);
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleRemoveCartItem = async (productId) => {
    try {
      setAppError('');

      if (token) {
        await api.removeCartItem(productId);
        await loadServerCart();
        return;
      }

      const currentCart = readGuestCart();
      const nextCart = buildGuestCart(
        currentCart.items.filter((item) => item.productId !== Number(productId))
      );
      saveGuestCart(nextCart);
      setCart(nextCart);
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleClearCart = async () => {
    try {
      setAppError('');

      if (token) {
        await api.clearCart();
        await loadServerCart();
        return;
      }

      clearGuestCart();
      setCart(buildGuestCart());
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleCheckout = () => {
    if (!cart?.items?.length) {
      setAppError('Seu carrinho está vazio.');
      return;
    }
    setAppError('');
    setIsCartOpen(false);

    if (!token) {
      try {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, '/checkout');
        sessionStorage.setItem('login_notice', 'Faça login para confirmar seu pedido.');
      } catch {
        // noop
      }
      navigate('/login');
      return;
    }

    navigate('/checkout');
  };

  const handleContinueShopping = () => {
    setSuccessOrder(null);
    navigate('/products');
  };

  const handleProtectedNavigate = (path, notice = 'Faça login para continuar.') => {
    if (token) {
      navigate(path);
      return;
    }

    try {
      sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
      sessionStorage.setItem('login_notice', notice);
    } catch {
      // noop
    }

    navigate('/login');
  };

  const clearPostLoginRedirect = () => {
    try {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    } catch {
      // noop
    }
  };

  const cartCount = (cart?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
  const isLoginRoute = location.pathname === '/login';

  const protectedElement = (element, redirectPath = location.pathname) => {
    if (!isAuthHydrated) {
      return <Spinner text="Carregando sessão..." />;
    }

    if (token) {
      return element;
    }

    if (location.pathname === redirectPath) {
      try {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, redirectPath);
      } catch {
        // noop
      }
    }

    return <Navigate to="/login" replace />;
  };

  return (
    <div className="app">
      {!isLoginRoute && (
        <Navbar
          user={user}
          onLogout={handleLogout}
          cartCount={cartCount}
          onCartOpen={() => {
            if (token) {
              loadServerCart();
            } else {
              loadGuestCart();
            }
            setIsCartOpen(true);
          }}
          currentPage={currentPage}
          onNavigate={(page) => {
            setSuccessOrder(null);

            if (page === 'orders') {
              handleProtectedNavigate('/orders', 'Faça login para visualizar seus pedidos.');
              return;
            }
            if (page === 'addresses') {
              handleProtectedNavigate('/addresses', 'Faça login para gerenciar seus endereços.');
              return;
            }
            if (page === 'profile') {
              handleProtectedNavigate('/profile', 'Faça login para acessar seu perfil.');
              return;
            }
            if (page === 'login') {
              clearPostLoginRedirect();
              navigate('/login');
              return;
            }

            navigate(pathByPage[page] || '/products');
          }}
        />
      )}

      {appError && (
        <div style={{ paddingTop: '80px', padding: '1rem 2rem' }}>
          <Alert type="error" message={appError} />
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route
          path="/login"
          element={token ? <Navigate to="/products" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path="/products" element={<ProductsPage onAddToCart={handleAddToCart} />} />
        <Route path="/products/:id" element={<ProductDetailPage onAddToCart={handleAddToCart} />} />
        <Route
          path="/orders"
          element={protectedElement(<OrdersPage user={user} />, '/orders')}
        />
        <Route path="/addresses" element={protectedElement(<AddressesPage />, '/addresses')} />
        <Route
          path="/profile"
          element={protectedElement(<ProfilePage user={user} onUserUpdated={handleUserUpdated} />, '/profile')}
        />
        <Route path="/institucional" element={<InstitutionalHub />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/devolucao" element={<ReturnsPage />} />
        <Route path="/frete" element={<ShippingPage />} />
        <Route path="/seguranca" element={<SecurityPage />} />
        <Route
          path="/checkout"
          element={protectedElement(
            <CheckoutPage
              cart={cart}
              onBack={() => navigate('/products')}
              user={user}
            />,
            '/checkout'
          )}
        />
        <Route
          path="/success"
          element={protectedElement(
            <SuccessPage order={successOrder} onContinue={handleContinueShopping} />,
            '/success'
          )}
        />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>

      {!isLoginRoute && <Footer />}

      {!isLoginRoute && isCartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setIsCartOpen(false)}
          onUpdate={handleUpdateCartItem}
          onRemove={handleRemoveCartItem}
          onClear={handleClearCart}
          onCheckout={handleCheckout}
          isLoading={isCartLoading}
        />
      )}
    </div>
  );
}

export default App;

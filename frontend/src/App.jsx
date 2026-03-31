import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
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
import './styles/global.css';
import './styles/forms.css';
import './pages/CheckoutPage.css';
import './pages/OrdersPage.css';
import api from './services/api';

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

  useEffect(() => {
    const handleAuthExpired = (event) => {
      const message = event?.detail?.message || 'Sua sessão expirou ou é inválida. Faça login novamente.';
      api.setToken(null);
      sessionStorage.removeItem('auth_token');
      sessionStorage.setItem('login_notice', message);
      setToken(null);
      setUser(null);
      setCart(null);
      setSuccessOrder(null);
      setIsCartOpen(false);
      setAppError('');
      navigate('/', { replace: true });
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
    institucional: '/institucional',
    sobre: '/sobre',
    devolucao: '/devolucao',
    frete: '/frete',
    seguranca: '/seguranca',
  };

  const currentPage = pageByPath[location.pathname] || 'products';

  const loadCart = useCallback(async () => {
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

  // Load token from sessionStorage on mount (per tab)
  useEffect(() => {
    const savedToken = sessionStorage.getItem('auth_token');
    if (!savedToken) {
      return;
    }

    api.setToken(savedToken);
    setToken(savedToken);

    api
      .getMe()
      .then((userData) => setUser(userData))
      .catch(() => {
        api.setToken(null);
        sessionStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setCart(null);
        setSuccessOrder(null);
      });
  }, []);

  // Load cart when user is logged in
  useEffect(() => {
    if (token) {
      loadCart();
    }
  }, [token, loadCart]);

  const handleLoginSuccess = (newToken, userData) => {
    api.setToken(newToken);
    sessionStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(userData);
    setSuccessOrder(null);
    loadCart();
    navigate('/products', { replace: true });
  };

  const handleLogout = () => {
    api.setToken(null);
    sessionStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    setCart(null);
    setSuccessOrder(null);
    navigate('/', { replace: true });
  };

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handleAddToCart = async (productId, quantity) => {
    try {
      setAppError('');
      await api.addToCart(productId, quantity);
      await loadCart();
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleUpdateCartItem = async (productId, quantity) => {
    try {
      setAppError('');
      if (quantity < 1) {
        await api.removeCartItem(productId);
      } else {
        await api.updateCartItem(productId, quantity);
      }
      await loadCart();
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleRemoveCartItem = async (productId) => {
    try {
      setAppError('');
      await api.removeCartItem(productId);
      await loadCart();
    } catch (err) {
      setAppError(err.message);
    }
  };

  const handleClearCart = async () => {
    try {
      setAppError('');
      await api.clearCart();
      await loadCart();
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
    navigate('/checkout');
  };

  const handleCheckoutSuccess = async (order) => {
    setIsCartOpen(false);
    setSuccessOrder(order);
    setAppError('');
    navigate('/success');
    await loadCart();
  };

  const handleContinueShopping = () => {
    setSuccessOrder(null);
    navigate('/products');
  };

  const cartCount = (cart?.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <Navbar
        user={user}
        onLogout={handleLogout}
        cartCount={cartCount}
        onCartOpen={() => {
          loadCart();
          setIsCartOpen(true);
        }}
        currentPage={currentPage}
        onNavigate={(page) => {
          setSuccessOrder(null);
          navigate(pathByPage[page] || '/products');
        }}
      />

      {appError && (
        <div style={{ paddingTop: '80px', padding: '1rem 2rem' }}>
          <Alert type="error" message={appError} />
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />
        <Route path="/products" element={<ProductsPage onAddToCart={handleAddToCart} />} />
        <Route path="/products/:id" element={<ProductDetailPage onAddToCart={handleAddToCart} />} />
        <Route path="/orders" element={<OrdersPage user={user} />} />
        <Route path="/addresses" element={<AddressesPage />} />
        <Route path="/profile" element={<ProfilePage user={user} onUserUpdated={handleUserUpdated} />} />
        <Route path="/institucional" element={<InstitutionalHub />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/devolucao" element={<ReturnsPage />} />
        <Route path="/frete" element={<ShippingPage />} />
        <Route path="/seguranca" element={<SecurityPage />} />
        <Route
          path="/checkout"
          element={
            <CheckoutPage
              cart={cart}
              onBack={() => navigate('/products')}
              user={user}
            />
          }
        />
        <Route
          path="/success"
          element={<SuccessPage order={successOrder} onContinue={handleContinueShopping} />}
        />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>

      {isCartOpen && (
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

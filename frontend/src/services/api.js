// API Configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

class APIService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders(extra = {}, options = {}) {
    const { includeAuth = true } = options;
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };

    if (!includeAuth) {
      return headers;
    }

    let token = this.token;
    if (!token) {
      try {
        token = sessionStorage.getItem('auth_token');
        if (token) {
          this.token = token;
        }
      } catch {
        token = null;
      }
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(method, path, body, allowRetry = true) {
    const authPublicPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/password/forgot',
      '/auth/password/reset',
    ];
    const isAuthPublicRequest = authPublicPaths.includes(path);

    const headers = this.getHeaders({}, { includeAuth: !isAuthPublicRequest });
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const rawText = response.status === 204 ? '' : await response.text();
    const tryParseJson = () => {
      if (!rawText) return null;
      try {
        return JSON.parse(rawText);
      } catch {
        return null;
      }
    };

    if (!response.ok) {
      let message = `Erro ${response.status}`;
      const data = tryParseJson();
      if (data && typeof data === 'object') {
        message = data.message || data.error || message;
      } else if (rawText) {
        message = rawText;
      }

      const hasAuthHeader = Boolean(headers.Authorization);
      const isSessionUnauthorized = response.status === 401 && hasAuthHeader && !isAuthPublicRequest;

      if (isSessionUnauthorized && allowRetry) {
        let latestToken = null;
        try {
          latestToken = sessionStorage.getItem('auth_token');
        } catch {
          latestToken = null;
        }
        const sentToken = hasAuthHeader ? String(headers.Authorization).replace('Bearer ', '') : null;
        if (latestToken && latestToken !== sentToken) {
          this.token = latestToken;
          return this.request(method, path, body, false);
        }
      }

      if (isSessionUnauthorized) {
        message = 'Sua sessão expirou ou é inválida. Faça login novamente.';
        this.token = null;
        try {
          sessionStorage.removeItem('auth_token');
          sessionStorage.setItem('login_notice', message);
        } catch {
          // noop
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(
            new CustomEvent('api:auth-expired', {
              detail: { status: response.status, message },
            })
          );
        }
      }

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;

    const parsed = tryParseJson();
    if (parsed !== null) return parsed;
    return rawText || null;
  }

  // Generic methods
  get(path) {
    return this.request('GET', path);
  }

  post(path, body) {
    return this.request('POST', path, body);
  }

  put(path, body) {
    return this.request('PUT', path, body);
  }

  patch(path, body) {
    return this.request('PATCH', path, body);
  }

  delete(path) {
    return this.request('DELETE', path);
  }

  // Auth endpoints
  login(email, password) {
    return this.post('/auth/login', { email, password });
  }

  register(user) {
    return this.post('/auth/register', user);
  }

  forgotPassword(email) {
    return this.post('/auth/password/forgot', { email });
  }

  resetPassword(token, newPassword) {
    return this.post('/auth/password/reset', { token, newPassword });
  }

  getMe() {
    return this.get('/auth/me');
  }

  // Products endpoints
  getProducts() {
    return this.get('/products');
  }

  getProduct(id) {
    return this.get(`/products/${id}`);
  }

  createProduct(product) {
    return this.post('/products', product);
  }

  updateProduct(id, product) {
    return this.put(`/products/${id}`, product);
  }

  deleteProduct(id) {
    return this.delete(`/products/${id}`);
  }

  // Categories endpoints
  getCategories() {
    return this.get('/categories');
  }

  createCategory(category) {
    return this.post('/categories', category);
  }

  updateCategory(id, category) {
    return this.put(`/categories/${id}`, category);
  }

  deleteCategory(id) {
    return this.delete(`/categories/${id}`);
  }

  // Cart endpoints
  getCart() {
    return this.get('/cart');
  }

  addToCart(productId, quantity) {
    return this.post(`/cart/items?productId=${productId}&quantity=${quantity}`);
  }

  updateCartItem(productId, quantity) {
    return this.put(`/cart/items/${productId}?quantity=${quantity}`);
  }

  removeCartItem(productId) {
    return this.delete(`/cart/items/${productId}`);
  }

  clearCart() {
    return this.delete('/cart');
  }

  // Addresses endpoints
  getAddresses() {
    return this.get('/addresses');
  }

  createAddress(address) {
    return this.post('/addresses', address);
  }

  updateAddress(id, address) {
    return this.put(`/addresses/${id}`, address);
  }

  setDefaultAddress(id) {
    return this.patch(`/addresses/${id}/default`);
  }

  deleteAddress(id) {
    return this.delete(`/addresses/${id}`);
  }

  // Checkout endpoints
  checkout(addressId, shipping) {
    const payload = {
      addressId,
      shippingAmount: shipping?.amount,
      shippingLabel: shipping?.label,
    };
    return this.post('/checkout', payload);
  }

  createAbacatePayCheckout(addressId, shipping) {
    const payload = {
      addressId,
      shippingAmount: shipping?.amount,
      shippingLabel: shipping?.label,
    };
    return this.post('/checkout', payload);
  }

  async getShippingQuote(payload) {
    const externalQuoteUrl = process.env.REACT_APP_SHIPPING_QUOTE_URL;

    if (!externalQuoteUrl) {
      return this.post('/shipping/quote', payload);
    }

    const headers = this.getHeaders();
    const response = await fetch(externalQuoteUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const rawText = response.status === 204 ? '' : await response.text();
    let parsed = null;
    if (rawText) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const message = parsed?.message || parsed?.error || rawText || `Erro ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return parsed ?? rawText ?? null;
  }

  // Orders endpoints
  getOrders() {
    return this.get('/orders');
  }

  getMyOrders() {
    return this.get('/orders/me');
  }

  getOrder(id) {
    return this.get(`/orders/${id}`);
  }

  updateOrder(id, order) {
    return this.put(`/orders/${id}`, order);
  }

  deleteOrder(id) {
    return this.delete(`/orders/${id}`);
  }

  // Admin users endpoints
  getUsers() {
    return this.get('/users');
  }

  getUserById(id) {
    return this.get(`/users/${id}`);
  }

  createUser(user) {
    return this.post('/auth/register', user);
  }

  deleteUser(id) {
    return this.delete(`/users/${id}`);
  }

  // Users endpoints
  updateUser(id, user) {
    return this.put(`/users/${id}`, user);
  }

  updateMyPassword(currentPassword, newPassword) {
    return this.put('/users/me/password', { currentPassword, newPassword });
  }
}

  const apiService = new APIService();
  export default apiService;

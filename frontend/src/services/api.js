// API Configuration
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

class APIService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(method, path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: this.getHeaders(),
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

  // Categories endpoints
  getCategories() {
    return this.get('/categories');
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
  checkout(addressId) {
    return this.post('/checkout', { addressId });
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

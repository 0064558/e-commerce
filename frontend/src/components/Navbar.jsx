import React from 'react';
import './Navbar.css';

function Navbar({ user, onLogout, cartCount, onCartOpen, currentPage, onNavigate }) {
  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => onNavigate('products')}>
        NEXUS
      </div>
      <div className="nav-links">
        <button
          className={`nav-btn ${currentPage === 'products' ? 'active' : ''}`}
          onClick={() => onNavigate('products')}
        >
          Produtos
        </button>
        <button
          className={`nav-btn ${currentPage === 'orders' ? 'active' : ''}`}
          onClick={() => onNavigate('orders')}
        >
          Pedidos
        </button>
        <button
          className={`nav-btn ${currentPage === 'addresses' ? 'active' : ''}`}
          onClick={() => onNavigate('addresses')}
        >
          Endereços
        </button>
        <button className="cart-btn" onClick={onCartOpen}>
          🛒 Carrinho
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
      <div className="nav-user">
        <span className="user-chip">👤 {user.name?.split(' ')[0]}</span>
        <button className="logout-btn" onClick={onLogout}>
          Sair
        </button>
      </div>
    </nav>
  );
}

export default Navbar;

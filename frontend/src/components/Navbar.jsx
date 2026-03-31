import React, { useEffect, useRef, useState } from 'react';
import './Navbar.css';

function Navbar({ user, onLogout, cartCount, onCartOpen, currentPage, onNavigate }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleUserMenuNavigate = (page) => {
    setIsUserMenuOpen(false);
    onNavigate(page);
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    onLogout();
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-logo" onClick={() => onNavigate('products')}>
          NEXUS
        </div>
        <button
          className={`nav-btn nav-home-pill ${currentPage === 'products' ? 'active' : ''}`}
          onClick={() => onNavigate('products')}
        >
          <span className="catalog-icon" aria-hidden="true">▦</span>
          Home
        </button>
      </div>

      <div className="nav-center">
        <div className="nav-links">
          <button
            className={`nav-btn nav-center-link ${currentPage === 'sobre' ? 'active' : ''}`}
            onClick={() => onNavigate('sobre')}
          >
            Sobre nós
          </button>
          <button
            className={`nav-btn nav-center-link ${currentPage === 'devolucao' ? 'active' : ''}`}
            onClick={() => onNavigate('devolucao')}
          >
            Devolução
          </button>
          <button
            className={`nav-btn nav-center-link ${currentPage === 'frete' ? 'active' : ''}`}
            onClick={() => onNavigate('frete')}
          >
            Frete
          </button>
          <button
            className={`nav-btn nav-center-link ${currentPage === 'seguranca' ? 'active' : ''}`}
            onClick={() => onNavigate('seguranca')}
          >
            Segurança
          </button>
        </div>
      </div>

      <div className="nav-user" ref={userMenuRef}>
        <button className="cart-btn cart-side-btn" onClick={onCartOpen}>
          🛒 Carrinho
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

        <button
          className={`user-chip user-menu-trigger ${isUserMenuOpen ? 'open' : ''}`}
          type="button"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="menu"
        >
          <span className="user-chip-icon">👤</span>
          <span className="user-chip-name">{user.name?.split(' ')[0]}</span>
          <span className="user-chip-hamburger">☰</span>
        </button>

        {isUserMenuOpen && (
          <div className="user-menu-dropdown" role="menu">
            <button
              className={`user-menu-item ${currentPage === 'orders' ? 'active' : ''}`}
              type="button"
              onClick={() => handleUserMenuNavigate('orders')}
            >
              Pedidos
            </button>
            <button
              className={`user-menu-item ${currentPage === 'addresses' ? 'active' : ''}`}
              type="button"
              onClick={() => handleUserMenuNavigate('addresses')}
            >
              Endereços
            </button>
            <button
              className={`user-menu-item ${currentPage === 'profile' ? 'active' : ''}`}
              type="button"
              onClick={() => handleUserMenuNavigate('profile')}
            >
              Perfil
            </button>
            <div className="user-menu-separator" />
            <button
              className="user-menu-item danger"
              type="button"
              onClick={handleLogoutClick}
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

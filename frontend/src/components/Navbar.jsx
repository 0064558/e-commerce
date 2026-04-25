import React, { useEffect, useRef, useState } from 'react';
import './Navbar.css';

function CartIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="20" r="1.6" />
      <circle cx="18" cy="20" r="1.6" />
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.4a1 1 0 0 0 1-.8L21 8H7" />
    </svg>
  );
}

function UserIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}


function Navbar({ user, onLogout, cartCount, onCartOpen, currentPage, onNavigate }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'Cliente';

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

  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="nav-logo" onClick={() => onNavigate('products')}>
          NEXUS
        </div>
        
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
        <button
          className="cart-btn cart-side-btn icon-only"
          onClick={onCartOpen}
          type="button"
          aria-label={cartCount > 0 ? `Abrir carrinho com ${cartCount} item(ns)` : 'Abrir carrinho'}
          title="Abrir carrinho"
        >
          <CartIcon className="nav-icon-svg" />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

        {user ? (
          <>
            <button
              className={`user-chip user-menu-trigger ${isUserMenuOpen ? 'open' : ''}`}
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu do usuário"
              title="Menu do usuário"
            >
              <UserIcon className="nav-icon-svg" />
              <span className="user-greeting">Olá, {firstName}</span>
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
                {user?.role === 'ADMIN' && (
                  <button
                    className={`user-menu-item ${currentPage === 'admin' ? 'active' : ''}`}
                    type="button"
                    onClick={() => handleUserMenuNavigate('admin')}
                  >
                    Painel Admin
                  </button>
                )}
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
          </>
        ) : (
          <div className="login-cta-wrap">
            <button
              className="nav-btn nav-login-pill icon-only"
              type="button"
              onClick={() => onNavigate('login')}
              aria-label="Entrar"
              title="Entrar"
            >
              <UserIcon className="nav-icon-svg" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;

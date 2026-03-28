import React from 'react';
import { formatCurrency } from '../utils/helpers';
import Spinner from './Spinner';
import './CartDrawer.css';

function CartDrawer({
  cart,
  onClose,
  onUpdate,
  onRemove,
  onClear,
  onCheckout,
  isLoading,
}) {
  const items = cart?.items || [];
  const total = cart?.total || 0;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <div className="drawer-title">CARRINHO</div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {isLoading ? (
            <Spinner text="Carregando..." />
          ) : items.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <div>Carrinho vazio</div>
              <div className="fs-sm text-muted mt-1">
                Adicione produtos para começar
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.productName}</div>
                  <div className="cart-item-price">
                    {formatCurrency(item.productPrice)} cada
                  </div>
                  <div className="qty-controls">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdate(item.productId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className="qty-val">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => onUpdate(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                    <span className="text-muted fs-sm ml-2">
                      {formatCurrency(item.subTotal)}
                    </span>
                  </div>
                </div>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(item.productId)}
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-footer">
            <div className="cart-total-row">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-val">{formatCurrency(total)}</span>
            </div>
            <button className="btn mb-1" onClick={onCheckout}>
              FINALIZAR COMPRA
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={onClear}
            >
              Limpar carrinho
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CartDrawer;

import React, { useState, useEffect } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/helpers';
import './OrdersPage.css';
import api from '../services/api';

function OrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const isAdmin = user?.role === 'ADMIN';

  const getProductsTotal = (order) => Number(order?.productsTotal ?? order?.total ?? order?.totalAmount ?? 0);
  const getShippingAmount = (order) => Number(order?.shippingAmount ?? 0);
  const getGrandTotal = (order) => Number(order?.grandTotal ?? (getProductsTotal(order) + getShippingAmount(order)));
  const getShippingLabel = (order) => order?.shippingLabel || 'Frete';

  useEffect(() => {
    loadOrders();
  }, [isAdmin]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const data = isAdmin ? await api.getOrders() : await api.getMyOrders();
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.moment || b.createdAt) - new Date(a.moment || a.createdAt));
      setOrders(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = async (order, event) => {
    if (event) {
      event.stopPropagation();
    }

    setPayingOrderId(order?.id || null);
    setError('');

    try {
      const statusValue = order?.orderStatus || order?.status;
      const addressId = order?.address?.id || order?.shippingAddress?.id;
      const canRefreshCheckout = !isAdmin && statusValue === 'WAITING_PAYMENT' && !!addressId;

      let checkoutUrl = order?.checkoutUrl;

      if (canRefreshCheckout) {
        const hasOrderShipping = order?.shippingAmount != null || Boolean(order?.shippingLabel);
        const refreshed = await api.createAbacatePayCheckout(
          addressId,
          hasOrderShipping
            ? {
                amount: getShippingAmount(order),
                label: getShippingLabel(order),
              }
            : undefined
        );
        const refreshedOrder = refreshed?.order;
        const refreshedUrl =
          refreshed?.checkoutUrl ||
          refreshedOrder?.checkoutUrl ||
          refreshed?.url ||
          refreshed?.paymentUrl;
        if (refreshedUrl) {
          checkoutUrl = refreshedUrl;
          setOrders((prev) =>
            prev.map((item) =>
              item.id === order.id
                ? {
                    ...item,
                    ...(refreshedOrder || {}),
                    checkoutUrl: refreshedUrl,
                  }
                : item
            )
          );
          setSelectedOrder((prev) =>
            prev && prev.id === order.id
              ? {
                  ...prev,
                  ...(refreshedOrder || {}),
                  checkoutUrl: refreshedUrl,
                }
              : prev
          );
        }
      }

      if (!checkoutUrl) {
        throw new Error('Checkout indisponível para este pedido.');
      }

      window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err.message || 'Falha ao abrir checkout de pagamento.');
    } finally {
      setPayingOrderId(null);
    }
  };

  return (
    <div className="page orders-page">
      <div className="container">
        <div className="page-header">
          <div className="page-title">{isAdmin ? 'TODOS OS PEDIDOS' : 'MEUS PEDIDOS'}</div>
          <div className="page-sub">{orders.length} pedido(s) encontrado(s)</div>
        </div>

        {isAdmin && <Alert type="info" message="Modo admin: exibindo todos os pedidos do sistema." />}
        {!isAdmin && <Alert type="info" message="Exibindo seus pedidos realizados neste usuário." />}

        {error && <Alert type="error" message={error} />}

        <div className="orders-list">
          {isLoading ? (
            <Spinner text="Carregando pedidos..." />
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                Você ainda não realizou pedidos.
              </div>
            </div>
          ) : (
            orders.map((order) => (
              (() => {
                const statusValue = order.orderStatus || order.status;
                const shippingAmount = getShippingAmount(order);
                const grandTotal = getGrandTotal(order);
                return (
              <div
                key={order.id}
                className="order-card"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="order-header">
                  <div>
                    <div className="order-id">Pedido #{order.id}</div>
                    <div className="order-date">{formatDate(order.moment || order.createdAt)}</div>
                  </div>
                  <span className={`order-status status-${order.orderStatus || order.status}`}>
                    {getStatusLabel(order.orderStatus || order.status)}
                  </span>
                </div>

                <div className="order-items-preview">
                  {(order.items || []).slice(0, 3).map((item, idx) => (
                    <span
                      key={item.productId || item.id || `${order.id}-${item.productName}-${idx}`}
                      className="order-item-tag"
                    >
                      {item.productName} x{item.quantity}
                    </span>
                  ))}
                </div>

                <div className="order-footer">
                  <div>
                    <div className="order-total">
                      {formatCurrency(grandTotal)}
                    </div>
                    <div className="order-addr">
                      {getShippingLabel(order)}: {shippingAmount === 0 ? 'Grátis' : formatCurrency(shippingAmount)}
                    </div>
                    {(order.address || order.shippingAddress) && (
                      <div className="order-addr">
                        {(order.address || order.shippingAddress).city}, {(order.address || order.shippingAddress).state}
                      </div>
                    )}
                  </div>
                  {statusValue === 'WAITING_PAYMENT' && order.checkoutUrl && (
                    <button
                      className="btn btn-ghost order-pay-btn"
                      type="button"
                      onClick={(event) => handlePayNow(order, event)}
                      disabled={payingOrderId === order.id}
                    >
                      {payingOrderId === order.id ? 'ATUALIZANDO...' : 'PAGAR AGORA'}
                    </button>
                  )}
                </div>

                {statusValue === 'CANCELED' && (
                  <div className="order-warning">
                    Pedido cancelado ou indisponibilidade de estoque. Se houve pagamento, entre em contato para estorno.
                  </div>
                )}
              </div>
                );
              })()
            ))
          )}
        </div>

        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onPayNow={handlePayNow}
            payingOrderId={payingOrderId}
          />
        )}
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onPayNow, payingOrderId }) {
  const productsTotal = Number(order?.productsTotal ?? order?.total ?? order?.totalAmount ?? 0);
  const shippingAmount = Number(order?.shippingAmount ?? 0);
  const shippingLabel = order?.shippingLabel || 'Frete';
  const grandTotal = Number(order?.grandTotal ?? (productsTotal + shippingAmount));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Detalhes do Pedido</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="info-detail">
            <span className="info-label">ID do Pedido:</span>
            <span className="info-val mono">{order.id}</span>
          </div>
          <div className="info-detail">
            <span className="info-label">Status:</span>
            <span className={`info-val status-${order.orderStatus || order.status}`}>
              {getStatusLabel(order.orderStatus || order.status)}
            </span>
          </div>
          {(order.orderStatus || order.status) === 'WAITING_PAYMENT' && order.checkoutUrl && (
            <button
              className="btn btn-ghost order-pay-btn"
              type="button"
              onClick={() => onPayNow(order)}
              disabled={payingOrderId === order.id}
            >
              {payingOrderId === order.id ? 'ATUALIZANDO...' : 'PAGAR AGORA'}
            </button>
          )}
          {order.orderStatus === 'CANCELED' && (
            <Alert
              type="error"
              message="Pedido cancelado por indisponibilidade de estoque. Se houve pagamento, entre em contato para estorno."
            />
          )}
          <div className="info-detail">
            <span className="info-label">Data:</span>
            <span className="info-val">{formatDate(order.moment || order.createdAt)}</span>
          </div>
          <div className="divider" />

          <h3 className="section-title">Itens</h3>
          {(order.items || []).length === 0 ? (
            <div className="text-muted fs-sm">Nenhum item detalhado disponível para este pedido.</div>
          ) : (
            (order.items || []).map((item, idx) => (
              <div key={item.productId || item.id || `${order.id}-detail-${idx}`} className="order-item-detail">
                <div className="item-name">{item.productName}</div>
                <div className="item-price">
                  {item.quantity}x {formatCurrency(item.productPrice)}
                </div>
                <div className="item-subtotal">
                  Subtotal: {formatCurrency(item.subTotal)}
                </div>
              </div>
            ))
          )}

          <div className="divider" />

          <div className="info-detail">
            <span className="info-label">Subtotal dos produtos:</span>
            <span className="info-val mono">{formatCurrency(productsTotal)}</span>
          </div>
          <div className="info-detail">
            <span className="info-label">{shippingLabel}:</span>
            <span className="info-val mono">{shippingAmount === 0 ? 'Grátis' : formatCurrency(shippingAmount)}</span>
          </div>
          <div className="info-detail">
            <span className="info-label">Total:</span>
            <span className="info-val mono" style={{ fontSize: '1.1rem' }}>
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {(order.address || order.shippingAddress) && (
            <>
              <div className="divider" />
              <h3 className="section-title">Endereço de Entrega</h3>
              <div className="address-info">
                <p>{(order.address || order.shippingAddress).street}, {(order.address || order.shippingAddress).number}</p>
                {(order.address || order.shippingAddress).complement && (
                  <p>{(order.address || order.shippingAddress).complement}</p>
                )}
                <p>
                  {(order.address || order.shippingAddress).neighborhood}, {(order.address || order.shippingAddress).city} -{' '}
                  {(order.address || order.shippingAddress).state}
                </p>
                <p>CEP: {(order.address || order.shippingAddress).zipCode}</p>
              </div>
            </>
          )}

          <div className="divider" />
          <div className="section-title">Pagamento</div>
          {order.paymentMoment ? (
            <div className="info-detail">
              <span className="info-label">Aprovado em</span>
              <span className="info-val text-success">{formatDate(order.paymentMoment)}</span>
            </div>
          ) : (
            <Alert type="info" message="Pagamento ainda não processado." />
          )}
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;

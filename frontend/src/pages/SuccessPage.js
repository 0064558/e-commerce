import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/helpers';

function SuccessPage({ order, onContinue }) {
  const location = useLocation();
  const navigate = useNavigate();
  const externalId = useMemo(
    () => new URLSearchParams(location.search).get('externalId'),
    [location.search]
  );
  const [resolvedOrder, setResolvedOrder] = useState(order || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) {
      setResolvedOrder(order);
      return;
    }
    if (!externalId) {
      return;
    }

    setIsLoading(true);
    setError('');
    api
      .getMyOrders()
      .then((orders) => {
        const list = Array.isArray(orders) ? orders : [];
        const found = list.find((item) => item.externalId === externalId);
        if (!found) {
          setError('Pagamento em processamento. Verifique seus pedidos.');
          return;
        }
        setResolvedOrder(found);
      })
      .catch((err) => setError(err.message || 'Falha ao buscar pedido.'))
      .finally(() => setIsLoading(false));
  }, [order, externalId]);

  const orderData = resolvedOrder;

  return (
    <div className="page">
      <div className="container">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <div className="success-title">STATUS DO PEDIDO</div>
          <div className="success-sub">
            {orderData ? `Pedido #${orderData.id}` : 'Aguardando confirmação...'}
          </div>

          {isLoading && <Spinner text="Carregando pedido..." />}
          {error && <Alert type="info" message={error} />}

          {orderData?.orderStatus === 'CANCELED' && (
            <Alert
              type="error"
              message="Pedido cancelado por indisponibilidade de estoque. Se houve pagamento, entre em contato para estorno."
            />
          )}

          {orderData?.paymentMoment && (
            <Alert type="success" message={`Pagamento aprovado em ${formatDate(orderData.paymentMoment)}`} />
          )}
          {orderData && !orderData.paymentMoment && (
            <Alert type="info" message={`Status: ${getStatusLabel(orderData.orderStatus)}`} />
          )}

          {orderData && (
            <div className="success-detail-card">
              <div className="section-title">Detalhes do Pedido</div>
              {(orderData.items || []).map((item) => (
                <div key={item.productId || item.id} className="summary-item">
                  <span className="summary-item-name">{item.productName} x{item.quantity}</span>
                  <span className="summary-item-val">{formatCurrency(item.subTotal)}</span>
                </div>
              ))}
              <div className="summary-total">
                <span className="summary-total-label">Total</span>
                <span className="summary-total-val">{formatCurrency(orderData.total || orderData.totalAmount)}</span>
              </div>
            </div>
          )}

          <button className="btn success-continue-btn" onClick={onContinue}>CONTINUAR COMPRANDO</button>
          <button className="btn btn-ghost success-continue-btn" onClick={() => navigate('/orders')}>
            VER PEDIDOS
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuccessPage;

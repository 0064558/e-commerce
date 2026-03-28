import React from 'react';
import Alert from '../components/Alert';
import { formatCurrency, formatDate } from '../utils/helpers';

function SuccessPage({ order, onContinue }) {
  return (
    <div className="page">
      <div className="container">
        <div className="success-screen">
          <div className="success-icon">✅</div>
          <div className="success-title">PEDIDO CONFIRMADO</div>
          <div className="success-sub">Seu pedido #{order?.id} foi realizado com sucesso.</div>

          {order?.paymentMoment && (
            <Alert type="success" message={`Pagamento aprovado em ${formatDate(order.paymentMoment)}`} />
          )}

          <div className="success-detail-card">
            <div className="section-title">Detalhes do Pedido</div>
            {(order?.items || []).map((item) => (
              <div key={item.productId || item.id} className="summary-item">
                <span className="summary-item-name">{item.productName} x{item.quantity}</span>
                <span className="summary-item-val">{formatCurrency(item.subTotal)}</span>
              </div>
            ))}
            <div className="summary-total">
              <span className="summary-total-label">Total</span>
              <span className="summary-total-val">{formatCurrency(order?.total || order?.totalAmount)}</span>
            </div>
          </div>

          <button className="btn success-continue-btn" onClick={onContinue}>CONTINUAR COMPRANDO</button>
        </div>
      </div>
    </div>
  );
}

export default SuccessPage;

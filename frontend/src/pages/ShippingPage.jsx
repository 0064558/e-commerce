import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InstitutionalPage.css';

function ShippingPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="container">
        <div className="institutional-hero">
          <div className="institutional-tag">Frete e entrega</div>
          <div>
            <div className="institutional-title">Entrega rastreada, sem zonas cinza</div>
            <p className="institutional-lead">
              Integramos parceiros confiáveis e checkpoints claros para previsão e rastreio em tempo real.
            </p>
          </div>
          <div className="institutional-actions">
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/institucional')}>
              Voltar ao institucional
            </button>
            <button className="btn" type="button" onClick={() => navigate('/products')}>
              Ver catálogo
            </button>
          </div>
        </div>

        <div className="institutional-content">
          <div className="content-card">
            <h3>Prazos estimados</h3>
            <p>
              O prazo varia por localidade e modalidade. Os dados aparecem antes da confirmação do pedido.
            </p>
          </div>
          <div className="content-card">
            <h3>Rastreamento</h3>
            <p>
              Assim que o pedido é despachado, você recebe o código de rastreio. Acompanhe o status direto
              na página de pedidos.
            </p>
          </div>
          <div className="content-card">
            <h3>Modalidades</h3>
            <div className="content-list">
              <div>Entrega padrão com previsão clara</div>
              <div>Opções expressas quando disponíveis</div>
              <div>Suporte rápido caso haja atrasos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShippingPage;

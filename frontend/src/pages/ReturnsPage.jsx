import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InstitutionalPage.css';

function ReturnsPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="container">
        <div className="institutional-hero">
          <div className="institutional-tag">Política de devolução</div>
          <div>
            <div className="institutional-title">Fluxo de troca com etapas claras</div>
            <p className="institutional-lead">
              Processo padronizado com prazos definidos e comunicação objetiva durante o ciclo.
            </p>
          </div>
          <div className="institutional-actions">
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/institucional')}>
              Voltar ao institucional
            </button>
            <button className="btn" type="button" onClick={() => navigate('/products')}>
              Continuar comprando
            </button>
          </div>
        </div>

        <div className="institutional-content">
          <div className="content-card">
            <h3>Prazos</h3>
            <p>
              Solicitações em até 7 dias corridos após o recebimento. Trocas por defeito seguem avaliação
              técnica do suporte.
            </p>
          </div>
          <div className="content-card">
            <h3>Condições</h3>
            <div className="content-list">
              <div>Produto sem sinais de uso e com embalagem original</div>
              <div>Acessórios e manuais completos</div>
              <div>Nota fiscal ou comprovante de compra</div>
            </div>
          </div>
          <div className="content-card">
            <h3>Como solicitar</h3>
            <p>
              Envie o número do pedido e o motivo. O suporte orienta o envio e acompanha até a finalização.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReturnsPage;

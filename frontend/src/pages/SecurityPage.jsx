import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InstitutionalPage.css';

function SecurityPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="container">
        <div className="institutional-hero">
          <div className="institutional-tag">Segurança</div>
          <div>
            <div className="institutional-title">Camadas de segurança ativas</div>
            <p className="institutional-lead">
              Dados e pagamentos tratados com boas práticas e fluxo isolado para reduzir risco.
            </p>
          </div>
          <div className="institutional-actions">
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/institucional')}>
              Voltar ao institucional
            </button>
            <button className="btn" type="button" onClick={() => navigate('/products')}>
              Ir para a loja
            </button>
          </div>
        </div>

        <div className="institutional-content">
          <div className="content-card">
            <h3>Proteção de dados</h3>
            <p>
              Dados pessoais são usados apenas para processar pedidos e melhorar o atendimento.
            </p>
          </div>
          <div className="content-card">
            <h3>Pagamentos confiáveis</h3>
            <p>
              O checkout utiliza parceiros confiáveis e os dados sensíveis não ficam armazenados aqui.
            </p>
          </div>
          <div className="content-card">
            <h3>Boas práticas</h3>
            <div className="content-list">
              <div>Monitoramento de pedidos e status em tempo real</div>
              <div>Notificações claras sobre cada etapa</div>
              <div>Suporte humano para qualquer dúvida</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityPage;

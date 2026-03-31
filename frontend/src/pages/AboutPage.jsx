import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InstitutionalPage.css';

function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="container">
        <div className="institutional-hero">
          <div className="institutional-tag">Sobre nós</div>
          <div>
            <div className="institutional-title">Arquitetura focada em experiência</div>
            <p className="institutional-lead">
              A NEXUS foi criada para reduzir fricção no e-commerce. Catálogo curado, checkout seguro e
              informação clara em cada etapa.
            </p>
          </div>
          <div className="institutional-actions">
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/institucional')}>
              Voltar ao institucional
            </button>
            <button className="btn" type="button" onClick={() => navigate('/products')}>
              Explorar produtos
            </button>
          </div>
        </div>

        <div className="institutional-content">
          <div className="content-card">
            <h3>Nossa missão</h3>
            <p>
              Entregar uma experiência de compra previsível, com informações objetivas, entrega rastreada
              e suporte com SLA curto.
            </p>
          </div>
          <div className="content-card">
            <h3>O que nos guia</h3>
            <p>
              Transparência, performance e respeito ao tempo do cliente. Isso aparece no catálogo, no
              atendimento e no pós-venda.
            </p>
            <div className="content-list">
              <div>Curadoria de produtos com foco em utilidade</div>
              <div>Comunicação direta, sem excesso de etapas</div>
              <div>Entrega acompanhada e rastreada</div>
            </div>
          </div>
          <div className="content-card">
            <h3>Compromisso com você</h3>
            <p>
              Nosso time monitora pedidos e resolve imprevistos com prioridade. Se algo fugir do esperado,
              você encontra caminhos claros para troca ou devolução.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

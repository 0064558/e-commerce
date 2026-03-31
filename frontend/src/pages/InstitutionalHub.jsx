import React from 'react';
import { useNavigate } from 'react-router-dom';
import './InstitutionalPage.css';

function InstitutionalHub() {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Sobre nós',
      text: 'Entenda o sistema, a missão e como o fluxo da loja foi desenhado.',
      path: '/sobre',
    },
    {
      title: 'Política de devolução',
      text: 'Prazos, condições e etapas de devolução explicadas por módulo.',
      path: '/devolucao',
    },
    {
      title: 'Frete e entrega',
      text: 'Prazos, modalidades e rastreio com checkpoints claros.',
      path: '/frete',
    },
    {
      title: 'Segurança',
      text: 'Camadas de segurança aplicadas do login ao checkout.',
      path: '/seguranca',
    },
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="institutional-hero">
          <div className="institutional-tag">Institucional</div>
          <div>
            <div className="institutional-title">Base técnica da experiência</div>
            <p className="institutional-lead">
              Documentação simples e objetiva para garantir compras seguras, processos claros e suporte
              previsível.
            </p>
          </div>
          <div className="institutional-actions">
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/products')}>
              Voltar para a loja
            </button>
          </div>
        </div>

        <div className="institutional-grid">
          {cards.map((card) => (
            <button
              key={card.path}
              className="institutional-card"
              type="button"
              onClick={() => navigate(card.path)}
            >
              <div className="institutional-card-title">{card.title}</div>
              <div className="institutional-card-text">{card.text}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InstitutionalHub;

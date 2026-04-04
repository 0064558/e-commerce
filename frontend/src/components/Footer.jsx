import React from 'react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Rodape do site">
      <div className="container footer-grid">
        <section className="footer-brand-block" aria-label="Marca">
          <div className="footer-brand">NEXUS</div>
          <p className="footer-brand-text">
            Ecommerce de tecnologia com foco em experiencia premium, entrega segura e suporte humano.
          </p>
        </section>

        <section className="footer-section" aria-label="Contato">
          <h4 className="footer-title">Contato</h4>
          <ul className="footer-list">
            <li>Email: atendimento@nexusstore.com.br</li>
            <li>Telefone: (31) 3333-9090</li>
            <li>WhatsApp: (31) 98888-9090</li>
            <li>Belo Horizonte - MG</li>
          </ul>
        </section>

        <section className="footer-section" aria-label="Redes sociais">
          <h4 className="footer-title">Redes sociais</h4>
          <div className="footer-socials">
            <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </section>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>Copyright {currentYear} NEXUS STORE. Todos os direitos reservados.</span>
          <span>Suporte: seg-sex das 8h as 18h</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/helpers';
import './ProductsPage.css';
import api from '../services/api';

function ProductsPage({ onAddToCart }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [contactStatus, setContactStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addedFeedback, setAddedFeedback] = useState({});

  const pageSize = 12;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, sortBy, minPrice, maxPrice]);

  const loadData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const featuredProducts = useMemo(() => {
    const sorted = [...products].sort(
      (a, b) => (b.stockQuantity || 0) - (a.stockQuantity || 0)
    );
    return sorted.slice(0, 3);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const minValue = parseFloat(minPrice);
    const maxValue = parseFloat(maxPrice);
    const hasMin = Number.isFinite(minValue);
    const hasMax = Number.isFinite(maxValue);

    return products.filter((product) => {
      const name = (product.name || '').toLowerCase();
      const desc = (product.description || '').toLowerCase();
      const matchSearch =
        !search || name.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());

      const matchCategory =
        !selectedCategory ||
        (product.categories || []).some((cat) => cat.id === selectedCategory);

      const price = Number(product.price || 0);
      const matchMin = !hasMin || price >= minValue;
      const matchMax = !hasMax || price <= maxValue;

      return matchSearch && matchCategory && matchMin && matchMax;
    });
  }, [products, search, selectedCategory, minPrice, maxPrice]);

  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts];
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name-desc':
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'price-asc':
        sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
        break;
    }
    return sorted;
  }, [filteredProducts, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * pageSize;
  const pagedProducts = sortedProducts.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleAddToCart = async (product) => {
    if (product.stockQuantity === 0) return;

    setAddingId(product.id);
    try {
      await onAddToCart(product.id, 1);
      setAddedFeedback((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedFeedback((prev) => ({ ...prev, [product.id]: false }));
      }, 1500);
    } finally {
      setAddingId(null);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setSortBy('relevance');
    setMinPrice('');
    setMaxPrice('');
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const maxButtons = 5;
    let start = Math.max(1, currentPageSafe - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  };

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const highlightMetrics = [
    { label: 'Clientes cadastrados', value: '1.2k' },
    { label: 'SLA de suporte', value: '2h' },
    { label: 'Checkout 24/7', value: 'Online' },
  ];

  const handleContactSubmit = (event) => {
    event.preventDefault();
    setContactStatus('Ticket aberto. Retorno enviado em breve.');
    setContactForm({ name: '', email: '', message: '' });
  };

  const handleCardOpen = (productId) => {
    navigate(`/products/${productId}`);
  };

  const handleQuickView = (event, product) => {
    event.stopPropagation();
    setQuickViewProduct(product);
  };

  const handleAddToCartClick = (event, product) => {
    event.stopPropagation();
    handleAddToCart(product);
  };

  const handleGoToProduct = (productId) => {
    setQuickViewProduct(null);
    navigate(`/products/${productId}`);
  };

  return (
    <div className="page products-page">
      <div className="container">
        <section className="shop-hero">
          <div className="hero-content">
            <div className="hero-tag">Catálogo inteligente</div>
            <h1 className="hero-title">Stack completo para compras rápidas</h1>
            <p className="hero-lead">
              Experiência otimizada com filtros, checkout seguro e informações transparentes. Tudo para
              reduzir atrito e acelerar a decisão de compra.
            </p>
            <div className="hero-actions">
              <button className="btn" type="button" onClick={() => scrollToSection('catalog')}>
                Ver catálogo
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => navigate('/institucional')}>
                Políticas e suporte
              </button>
            </div>
            <div className="hero-metrics">
              {highlightMetrics.map((metric) => (
                <div key={metric.label} className="metric-card">
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-panel">
              <div className="hero-badge">Seleção em destaque</div>
              <div className="hero-panel-title">Compra simples, entrega clara</div>
              <div className="hero-banner-grid">
                <div className="banner-card">
                  <div className="banner-icon">🚚</div>
                  <div>
                    <div className="banner-title">Roteiro de entrega</div>
                    <div className="banner-text">Prazos e rastreio claros no painel.</div>
                  </div>
                </div>
                <div className="banner-card">
                  <div className="banner-icon">🔁</div>
                  <div>
                    <div className="banner-title">Troca sem fricção</div>
                    <div className="banner-text">Processo de devolução mapeada.</div>
                  </div>
                </div>
                <div className="banner-card">
                  <div className="banner-icon">🔒</div>
                  <div>
                    <div className="banner-title">Checkout protegido</div>
                    <div className="banner-text">Camadas de segurança em cada etapa.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && <Alert type="error" message={error} />}

        {featuredProducts.length > 0 && !isLoading && (
          <section className="featured-section">
            <div className="section-heading">
              <div>
                <div className="section-tag">Destaques</div>
                <div className="section-title">Escolhas com alta procura</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => scrollToSection('catalog')}
              >
                Ver catálogo completo
              </button>
            </div>
            <div className="featured-grid">
              {featuredProducts.map((product, index) => (
                <div key={product.id} className="featured-card" onClick={() => handleCardOpen(product.id)}>
                  <div className="featured-img">
                    {product.imgUrl ? (
                      <img
                        src={product.imgUrl}
                        alt={product.name}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={index === 0 ? 'high' : 'low'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="product-img-placeholder">🛍️</span>
                    )}
                  </div>
                  <div className="featured-body">
                    <div className="featured-name">{product.name}</div>
                    <div className="featured-desc">
                      {product.description || 'Seleção especial da loja.'}
                    </div>
                    <div className="featured-footer">
                      <div className="featured-price">{formatCurrency(product.price)}</div>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={(event) => handleQuickView(event, product)}
                      >
                        Visão rápida
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="catalog" className="catalog-section">
          <div className="section-heading">
            <div>
              <div className="section-tag">Catálogo</div>
              <div className="section-title">Encontre o que você procura</div>
            </div>
            <div className="results-meta">{sortedProducts.length} resultado(s)</div>
          </div>

          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Buscar por nome</label>
                <input
                  className="filter-input"
                  placeholder="Buscar produto ou palavra-chave"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>Ordenar</label>
                <select
                  className="filter-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance">Relevância</option>
                  <option value="name-asc">Nome A-Z</option>
                  <option value="name-desc">Nome Z-A</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Faixa de preço</label>
                <div className="price-range">
                  <input
                    className="filter-input"
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span className="price-sep">-</span>
                  <input
                    className="filter-input"
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-group">
                <label>Filtros</label>
                <button className="btn btn-ghost btn-sm" type="button" onClick={handleResetFilters}>
                  Limpar filtros
                </button>
              </div>
            </div>
            <div className="category-chips">
              <button
                className={`chip ${!selectedCategory ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`chip ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <Spinner text="Carregando produtos..." />
          ) : sortedProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-text">Nenhum produto encontrado.</div>
            </div>
          ) : (
            <>
              <div className="products-grid">
                {pagedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="product-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardOpen(product.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        handleCardOpen(product.id);
                      }
                    }}
                  >
                    <div className="product-img">
                      {product.imgUrl ? (
                        <img
                          src={product.imgUrl}
                          alt={product.name}
                          loading={index < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          fetchPriority={index < 4 ? 'high' : 'low'}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="product-img-placeholder">🛍️</span>
                      )}
                    </div>
                    <div className="product-info">
                      {(product.categories || []).length > 0 && (
                        <div className="product-cats">
                          {product.categories.map((cat) => (
                            <span key={cat.id} className="cat-tag">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc">
                        {product.description || 'Sem descrição.'}
                      </div>
                      <div className="product-footer">
                        <div>
                          <div className="product-price">{formatCurrency(product.price)}</div>
                          <div
                            className={`product-stock ${
                              product.stockQuantity === 0
                                ? 'stock-out'
                                : product.stockQuantity < 5
                                ? 'stock-low'
                                : ''
                            }`}
                          >
                            {product.stockQuantity === 0
                              ? 'Sem estoque'
                              : product.stockQuantity < 5
                              ? `Últimas ${product.stockQuantity} unid.`
                              : `${product.stockQuantity} em estoque`}
                          </div>
                        </div>
                        <div className="product-actions">
                          <button
                            className="product-view-btn"
                            type="button"
                            onClick={(event) => handleQuickView(event, product)}
                          >
                            Visão rápida
                          </button>
                          <button
                            className="add-cart-btn"
                            onClick={(event) => handleAddToCartClick(event, product)}
                            disabled={
                              product.stockQuantity === 0 || addingId === product.id
                            }
                          >
                            {addedFeedback[product.id]
                              ? '✓ Adicionado'
                              : addingId === product.id
                              ? '...'
                              : '+ Carrinho'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => handlePageChange(currentPageSafe - 1)}
                    disabled={currentPageSafe === 1}
                  >
                    Anterior
                  </button>
                  {getPageNumbers().map((page) => (
                    <button
                      key={page}
                      className={`page-btn ${page === currentPageSafe ? 'active' : ''}`}
                      type="button"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="page-btn"
                    type="button"
                    onClick={() => handlePageChange(currentPageSafe + 1)}
                    disabled={currentPageSafe === totalPages}
                  >
                    Próximo
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="contact-section">
          <div className="contact-grid">
            <div>
              <div className="section-tag">Contato</div>
              <div className="section-title">Fale com a gente</div>
              <p className="contact-lead">
                Abra um ticket e receba retorno com SLA curto. Nosso time acompanha cada etapa do fluxo.
              </p>
            </div>
            <form className="contact-form" onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label>Nome</label>
                <input
                  value={contactForm.name}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Seu nome"
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="contato@email.com"
                />
              </div>
              <div className="form-group">
                <label>Mensagem</label>
                <textarea
                  value={contactForm.message}
                  onChange={(event) =>
                    setContactForm((prev) => ({ ...prev, message: event.target.value }))
                  }
                  placeholder="Como podemos ajudar?"
                />
              </div>
              <button className="btn" type="submit">Enviar mensagem</button>
              {contactStatus && <div className="contact-success">{contactStatus}</div>}
            </form>
          </div>
        </section>

        <footer id="institutional" className="shop-footer">
          <div className="section-tag">Institucional</div>
          <div className="section-title">Informação clara e suporte direto</div>
          <div className="policy-grid">
            <button className="policy-card" type="button" onClick={() => navigate('/sobre')}>
              <div className="policy-title">Sobre nós</div>
              <div className="policy-text">Conheça a história e o jeito de atender da NEXUS.</div>
            </button>
            <button className="policy-card" type="button" onClick={() => navigate('/devolucao')}>
              <div className="policy-title">Devolução</div>
              <div className="policy-text">Trocas claras e prazo definido para devolução.</div>
            </button>
            <button className="policy-card" type="button" onClick={() => navigate('/frete')}>
              <div className="policy-title">Frete</div>
              <div className="policy-text">Prazos e rastreio explicados antes da compra.</div>
            </button>
            <button className="policy-card" type="button" onClick={() => navigate('/seguranca')}>
              <div className="policy-title">Segurança</div>
              <div className="policy-text">Pagamentos protegidos e dados tratados com cuidado.</div>
            </button>
          </div>
        </footer>
      </div>

      {quickViewProduct && (
        <div className="product-modal-overlay" onClick={() => setQuickViewProduct(null)}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setQuickViewProduct(null)}>
              ✕
            </button>
            <div className="modal-grid">
              <div className="modal-img">
                {quickViewProduct.imgUrl ? (
                  <img
                    src={quickViewProduct.imgUrl}
                    alt={quickViewProduct.name}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                  />
                ) : (
                  <span className="product-img-placeholder">🛍️</span>
                )}
              </div>
              <div className="modal-body">
                <div className="modal-title">{quickViewProduct.name}</div>
                <div className="modal-price">{formatCurrency(quickViewProduct.price)}</div>
                <div className="modal-desc">
                  {quickViewProduct.description || 'Sem descrição.'}
                </div>
                <div className="modal-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => handleAddToCart(quickViewProduct)}
                    disabled={
                      quickViewProduct.stockQuantity === 0 || addingId === quickViewProduct.id
                    }
                  >
                    Adicionar ao carrinho
                  </button>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => handleGoToProduct(quickViewProduct.id)}
                  >
                    Ir para a página
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setQuickViewProduct(null)}
                  >
                    Voltar
                  </button>
                </div>
                <div className="modal-meta">
                  <div>
                    Status:{' '}
                    <span className={quickViewProduct.stockQuantity === 0 ? 'text-danger' : 'text-success'}>
                      {quickViewProduct.stockQuantity === 0 ? 'Sem estoque' : 'Disponível'}
                    </span>
                  </div>
                  <div>{quickViewProduct.stockQuantity || 0} unidade(s) no estoque</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsPage;

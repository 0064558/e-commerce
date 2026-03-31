import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/helpers';
import api from '../services/api';
import './ProductDetailPage.css';

function ProductDetailPage({ onAddToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [related, setRelated] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getProduct(id);
      setProduct(data);
      setQuantity(1);
    } catch (err) {
      setError(err.message || 'Falha ao carregar produto.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!product) return;
    loadRelated(product);
  }, [product]);

  const loadRelated = async (baseProduct) => {
    try {
      const list = await api.getProducts();
      const baseCategories = new Set((baseProduct.categories || []).map((cat) => cat.id));
      let candidates = list.filter((item) => item.id !== baseProduct.id);
      if (baseCategories.size > 0) {
        candidates = candidates.filter((item) =>
          (item.categories || []).some((cat) => baseCategories.has(cat.id))
        );
      }
      setRelated(candidates.slice(0, 4));
    } catch (err) {
      setRelated([]);
    }
  };

  const stock = product?.stockQuantity || 0;
  const isOut = stock === 0;
  const isLow = stock > 0 && stock < 5;

  const categoryLabel = useMemo(() => {
    const names = (product?.categories || []).map((cat) => cat.name).filter(Boolean);
    return names.length ? names.join(', ') : 'Sem categoria';
  }, [product]);

  const handleAdjustQuantity = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (stock > 0 && next > stock) return stock;
      return next;
    });
  };

  const handleAddToCart = async () => {
    if (!product || isOut) return;
    setIsAdding(true);
    setError('');
    try {
      await onAddToCart(product.id, quantity);
    } catch (err) {
      setError(err.message || 'Falha ao adicionar ao carrinho.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="page product-detail-page">
      <div className="container">
        <div className="product-breadcrumb">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate('/products')}>
            ← Voltar ao catálogo
          </button>
          {product && <div className="breadcrumb-title">Produtos / {product.name}</div>}
        </div>

        {error && <Alert type="error" message={error} />}

        {isLoading ? (
          <Spinner text="Carregando produto..." />
        ) : !product ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Produto não encontrado.</div>
          </div>
        ) : (
          <>
            <div className="detail-grid">
              <div className="detail-media">
                {product.imgUrl ? (
                  <img src={product.imgUrl} alt={product.name} />
                ) : (
                  <span className="detail-placeholder">🛍️</span>
                )}
                <div className={`detail-stock ${isOut ? 'stock-out' : isLow ? 'stock-low' : ''}`}>
                  {isOut ? 'Sem estoque' : isLow ? 'Últimas unidades' : 'Disponível'}
                </div>
              </div>
              <div className="detail-info">
                <div className="detail-title">{product.name}</div>
                <div className="detail-price">{formatCurrency(product.price)}</div>
                <div className="detail-desc">
                  {product.description || 'Descrição não informada para este item.'}
                </div>

                <div className="detail-meta">
                  <div>SKU: NX-{product.id}</div>
                  <div>Categorias: {categoryLabel}</div>
                  <div>Estoque: {stock} unidade(s)</div>
                </div>

                <div className="detail-actions">
                  <div className="qty-selector">
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(-1)}
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustQuantity(1)}
                      disabled={stock > 0 && quantity >= stock}
                    >
                      +
                    </button>
                  </div>
                  <button className="btn" type="button" disabled={isOut || isAdding} onClick={handleAddToCart}>
                    {isAdding ? 'Adicionando...' : 'Adicionar ao carrinho'}
                  </button>
                </div>

                <div className="detail-links">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate('/frete')}>
                    Política de frete
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate('/seguranca')}>
                    Segurança no pagamento
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-panels">
              <div className="detail-panel">
                <div className="panel-title">Entrega monitorada</div>
                <p>
                  Status do pedido atualizado em tempo real. Acompanhe o envio direto no painel de pedidos.
                </p>
              </div>
              <div className="detail-panel">
                <div className="panel-title">Devolução simples</div>
                <p>
                  Processo de devolução mapeado e com suporte dedicado para reduzir tempo de resolução.
                </p>
              </div>
              <div className="detail-panel">
                <div className="panel-title">Suporte técnico</div>
                <p>
                  Atendimento com SLA curto e comunicação objetiva durante todo o fluxo.
                </p>
              </div>
            </div>

            {related.length > 0 && (
              <div className="detail-related">
                <div className="section-tag">Relacionados</div>
                <div className="section-title">Produtos no mesmo segmento</div>
                <div className="related-grid">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="related-card"
                      onClick={() => navigate(`/products/${item.id}`)}
                    >
                      <div className="related-name">{item.name}</div>
                      <div className="related-price">{formatCurrency(item.price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;

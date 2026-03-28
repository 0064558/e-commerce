import React, { useState, useEffect } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { formatCurrency } from '../utils/helpers';
import './ProductsPage.css';
import api from '../services/api';

function ProductsPage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addedFeedback, setAddedFeedback] = useState({});

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredProducts = products.filter((product) => {
    const matchSearch =
      !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.description || '')
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchCategory =
      !selectedCategory ||
      (product.categories || []).some((cat) => cat.id === selectedCategory);

    return matchSearch && matchCategory;
  });

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

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-title">PRODUTOS</div>
          <div className="page-sub">{products.length} itens disponíveis</div>
        </div>

        {error && <Alert type="error" message={error} />}

        <div className="filter-bar">
          <input
            className="search-box"
            placeholder="🔍  Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id
                  )
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Spinner text="Carregando produtos..." />
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Nenhum produto encontrado.</div>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-img">
                  {product.imgUrl ? (
                    <img
                      src={product.imgUrl}
                      alt={product.name}
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
                      <div className="product-price">
                        {formatCurrency(product.price)}
                      </div>
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
                    <button
                      className="add-cart-btn"
                      onClick={() => handleAddToCart(product)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;

import React, { useEffect, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import './CheckoutPage.css';

function CheckoutPage({ cart, onBack, onSuccess }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAddresses();
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
      const defaultAddress = list.find((item) => item.defaultAddress);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (list.length > 0) {
        setSelectedAddressId(list[0].id);
      }
    } catch (err) {
      setError(err.message || 'Falha ao carregar endereços.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.street || !addressForm.number || !addressForm.city || !addressForm.state || !addressForm.zipCode) {
      setError('Preencha os campos obrigatórios do endereço.');
      return;
    }

    setIsSavingAddress(true);
    setError('');
    try {
      const created = await api.createAddress(addressForm);
      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddForm(false);
      setAddressForm({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      });
    } catch (err) {
      setError(err.message || 'Falha ao salvar endereço.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm('Remover este endereço?')) {
      return;
    }

    try {
      await api.deleteAddress(id);
      setAddresses((prev) => prev.filter((item) => item.id !== id));
      if (selectedAddressId === id) {
        setSelectedAddressId(null);
      }
    } catch (err) {
      setError(err.message || 'Falha ao remover endereço.');
    }
  };

  const handleSetDefault = async (id, event) => {
    event.stopPropagation();
    try {
      await api.setDefaultAddress(id);
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Falha ao definir endereço padrão.');
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedAddressId) {
      setError('Selecione um endereço de entrega.');
      return;
    }

    setIsPlacingOrder(true);
    setError('');
    try {
      const order = await api.checkout(selectedAddressId);
      onSuccess(order);
    } catch (err) {
      setError(err.message || 'Falha ao finalizar pedido.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const items = cart?.items || [];
  const total = cart?.total || 0;

  return (
    <div className="page">
      <div className="container">
        <div className="page-header checkout-header">
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← Voltar</button>
          <div>
            <div className="page-title">CHECKOUT</div>
            <div className="page-sub">Finalize seu pedido</div>
          </div>
        </div>

        <Alert type="error" message={error} />

        <div className="checkout-grid">
          <div>
            <div className="section-title">Endereço de Entrega</div>
            {isLoading ? (
              <Spinner text="Carregando endereços..." />
            ) : (
              <>
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className={`address-card ${selectedAddressId === address.id ? 'selected' : ''}`}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    {address.defaultAddress && <div className="address-default-badge">PADRÃO</div>}
                    <div className="address-line fw-bold">
                      {address.street}, {address.number} {address.complement ? `- ${address.complement}` : ''}
                    </div>
                    <div className="address-line">
                      {address.neighborhood ? `${address.neighborhood}, ` : ''}{address.city} - {address.state}
                    </div>
                    <div className="address-line">CEP: {address.zipCode}</div>
                    <div className="address-actions">
                      {!address.defaultAddress && (
                        <button className="btn btn-outline btn-sm" onClick={(event) => handleSetDefault(address.id, event)}>
                          Definir como padrão
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={(event) => handleDeleteAddress(address.id, event)}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                <button className="add-address-toggle" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? '✕ Cancelar' : '+ Adicionar novo endereço'}
                </button>

                {showAddForm && (
                  <div className="address-form-panel">
                    <div className="section-title section-title-sm">Novo Endereço</div>
                    <div className="form-group">
                      <label>Rua / Logradouro *</label>
                      <input
                        value={addressForm.street}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, street: event.target.value }))}
                        placeholder="Rua das Flores"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Número *</label>
                        <input
                          value={addressForm.number}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, number: event.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className="form-group">
                        <label>Complemento</label>
                        <input
                          value={addressForm.complement}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, complement: event.target.value }))}
                          placeholder="Apto 4B"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Bairro</label>
                      <input
                        value={addressForm.neighborhood}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, neighborhood: event.target.value }))}
                        placeholder="Centro"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Cidade *</label>
                        <input
                          value={addressForm.city}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                          placeholder="São Paulo"
                        />
                      </div>
                      <div className="form-group">
                        <label>Estado *</label>
                        <input
                          value={addressForm.state}
                          onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
                          placeholder="SP"
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>CEP *</label>
                      <input
                        value={addressForm.zipCode}
                        onChange={(event) => setAddressForm((prev) => ({ ...prev, zipCode: event.target.value }))}
                        placeholder="00000-000"
                      />
                    </div>
                    <button className="btn" onClick={handleSaveAddress} disabled={isSavingAddress}>
                      {isSavingAddress ? 'Salvando...' : 'SALVAR ENDEREÇO'}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="section-title section-title-top">Método de Pagamento</div>
            <div className="payment-sim">
              <div className="text-dim fs-sm mb-2">Selecione a forma de pagamento (simulado)</div>
              <div className="payment-methods">
                {[
                  { id: 'PIX', icon: '⚡', label: 'PIX' },
                  { id: 'CREDIT', icon: '💳', label: 'Crédito' },
                  { id: 'DEBIT', icon: '🏦', label: 'Débito' },
                  { id: 'BOLETO', icon: '📄', label: 'Boleto' },
                ].map((method) => (
                  <div
                    key={method.id}
                    className={`payment-method ${paymentMethod === method.id ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <div className="payment-method-icon">{method.icon}</div>
                    {method.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-summary">
            <div className="section-title">Resumo do Pedido</div>
            {items.map((item) => (
              <div key={item.productId} className="summary-item">
                <span className="summary-item-name">{item.productName} <span className="text-muted">x{item.quantity}</span></span>
                <span className="summary-item-val">{formatCurrency(item.subTotal)}</span>
              </div>
            ))}
            <div className="summary-total">
              <span className="summary-total-label">Total</span>
              <span className="summary-total-val">{formatCurrency(total)}</span>
            </div>
            <div className="checkout-confirm-wrap">
              <button className="btn" onClick={handleConfirmOrder} disabled={isPlacingOrder || !selectedAddressId}>
                {isPlacingOrder ? 'Processando...' : 'CONFIRMAR PEDIDO'}
              </button>
              {!selectedAddressId && (
                <div className="text-muted fs-xs checkout-hint">Selecione um endereço</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

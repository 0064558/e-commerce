import React, { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';
import './CheckoutPage.css';

const roundPrice = (value) => Math.round(value * 100) / 100;

const getCepDistanceFactor = (zipCode) => {
  const digits = (zipCode || '').replace(/\D/g, '');
  if (!digits) return 1.2;

  const first = Number(digits.charAt(0));
  const factorMap = {
    0: 1.0,
    1: 1.0,
    2: 1.1,
    3: 1.15,
    4: 1.25,
    5: 1.35,
    6: 1.45,
    7: 1.5,
    8: 1.25,
    9: 1.35,
  };

  return factorMap[first] || 1.2;
};

const addBusinessDays = (businessDays) => {
  const date = new Date();
  let added = 0;

  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

const buildEta = (minDays, maxDays) => ({
  minDays,
  maxDays,
  etaText: `${minDays} a ${maxDays} dias úteis`,
  etaDateText: `${addBusinessDays(minDays)} a ${addBusinessDays(maxDays)}`,
});

const normalizeShippingApiOptions = (rawOptions) => {
  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((item, index) => {
      const priceValue =
        Number(item?.price ?? item?.cost ?? item?.value ?? item?.amount ?? Number.NaN);
      const minDays = Number(
        item?.minDays ?? item?.deadlineMin ?? item?.deliveryMin ?? item?.deliveryDays ?? Number.NaN
      );
      const maxDays = Number(
        item?.maxDays ?? item?.deadlineMax ?? item?.deliveryMax ?? item?.deliveryDays ?? Number.NaN
      );

      if (!Number.isFinite(priceValue) || !Number.isFinite(minDays) || !Number.isFinite(maxDays)) {
        return null;
      }

      const minSafe = Math.max(1, Math.floor(minDays));
      const maxSafe = Math.max(minSafe, Math.floor(maxDays));
      const service = item?.service || item?.name || item?.serviceName || `Opção ${index + 1}`;
      const carrier = item?.carrier || item?.provider || 'Transportadora';

      return {
        id: String(item?.id || item?.serviceCode || item?.code || `api-${index + 1}`),
        carrier,
        service,
        label: `${carrier} ${service}`,
        price: roundPrice(priceValue),
        ...buildEta(minSafe, maxSafe),
      };
    })
    .filter(Boolean);
};

const buildCorreiosSimulation = ({ zipCode, total, itemCount }) => {
  const digits = (zipCode || '').replace(/\D/g, '');
  if (digits.length !== 8) {
    return [];
  }

  const factor = getCepDistanceFactor(digits);
  const weightFactor = 1 + Math.max(0, itemCount - 1) * 0.08;
  const baseCost = (13.5 + itemCount * 1.45) * factor * weightFactor;
  const baseDays = factor <= 1.05 ? 2 : factor <= 1.2 ? 4 : factor <= 1.35 ? 6 : 8;
  const hasFreePac = total >= 349;
  const sedexMin = Math.max(1, baseDays - 2);
  const sedexMax = Math.max(sedexMin, baseDays);
  const pacMin = baseDays + 1;
  const pacMax = baseDays + 3;

  const options = [
    {
      id: 'correios-pac',
      carrier: 'Correios',
      service: 'PAC',
      label: hasFreePac ? 'Correios PAC (frete grátis)' : 'Correios PAC',
      price: hasFreePac ? 0 : roundPrice(Math.max(14.9, baseCost)),
      ...buildEta(pacMin, pacMax),
    },
    {
      id: 'correios-sedex',
      carrier: 'Correios',
      service: 'SEDEX',
      label: 'Correios SEDEX',
      price: roundPrice(Math.max(24.9, baseCost * 1.72 + 2)),
      ...buildEta(sedexMin, sedexMax),
    },
  ];

  return options;
};

function CheckoutPage({ cart, onBack, user }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [shippingSource, setShippingSource] = useState('simulado');
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShippingId, setSelectedShippingId] = useState('correios-pac');
  const lastCepLookup = useRef('');
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

  useEffect(() => {
    const digits = (addressForm.zipCode || '').replace(/\D/g, '');
    if (digits.length === 0) {
      lastCepLookup.current = '';
    }
    if (digits.length !== 8) {
      setIsCepLoading(false);
      setError('');
      setAddressForm((prev) => ({
        ...prev,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
      }));
    }
  }, [addressForm.zipCode]);

  const clearCepFields = () => {
    setAddressForm((prev) => ({
      ...prev,
      street: '',
      neighborhood: '',
      city: '',
      state: '',
    }));
  };

  const handleCepLookup = async () => {
    const digits = (addressForm.zipCode || '').replace(/\D/g, '');
    if (digits.length !== 8) {
      setError('Informe um CEP válido.');
      clearCepFields();
      return;
    }
    if (lastCepLookup.current === digits) {
      return;
    }

    lastCepLookup.current = digits;
    setIsCepLoading(true);
    setError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (data?.erro) {
        setError('CEP não encontrado.');
        clearCepFields();
        return;
      }
      setAddressForm((prev) => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
    } catch (err) {
      setError('Falha ao consultar CEP.');
      clearCepFields();
    } finally {
      setIsCepLoading(false);
    }
  };

  const formatCep = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) {
      return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

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

    if (isShippingLoading || !selectedShipping) {
      setError('Aguarde a cotação de frete para confirmar o pedido.');
      return;
    }

    if (!user?.taxId) {
      setError('CPF obrigatório. Atualize no perfil antes de pagar.');
      return;
    }

    setIsPlacingOrder(true);
    setError('');
    try {
      const response = await api.createAbacatePayCheckout(selectedAddressId, {
        amount: selectedShipping.price,
        label: selectedShipping.label,
      });
      const checkoutUrl = response?.checkoutUrl || response?.url || response?.paymentUrl;
      if (!checkoutUrl) {
        throw new Error('URL de checkout não retornada.');
      }
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(err.message || 'Falha ao finalizar pedido.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const items = cart?.items || [];
  const total = cart?.total || 0;
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  useEffect(() => {
    const zipCode = selectedAddress?.zipCode || '';
    const digits = zipCode.replace(/\D/g, '');

    if (!selectedAddressId || digits.length !== 8) {
      setShippingOptions([]);
      setShippingSource('simulado');
      return;
    }

    let isActive = true;

    const loadShippingQuotes = async () => {
      setIsShippingLoading(true);
      try {
        const apiResponse = await api.getShippingQuote({
          zipCode: digits,
          orderTotal: total,
          itemCount,
        });

        const rawOptions = Array.isArray(apiResponse)
          ? apiResponse
          : apiResponse?.options || apiResponse?.quotes || [];
        const normalized = normalizeShippingApiOptions(rawOptions);

        if (!isActive) return;

        if (normalized.length > 0) {
          setShippingOptions(normalized);
          setShippingSource('api');
          return;
        }

        setShippingOptions(buildCorreiosSimulation({ zipCode: digits, total, itemCount }));
        setShippingSource('simulado');
      } catch {
        if (!isActive) return;
        setShippingOptions(buildCorreiosSimulation({ zipCode: digits, total, itemCount }));
        setShippingSource('simulado');
      } finally {
        if (isActive) {
          setIsShippingLoading(false);
        }
      }
    };

    loadShippingQuotes();

    return () => {
      isActive = false;
    };
  }, [selectedAddressId, selectedAddress?.zipCode, total, itemCount]);

  useEffect(() => {
    if (!selectedAddressId || shippingOptions.length === 0) {
      return;
    }

    const hasSelected = shippingOptions.some((option) => option.id === selectedShippingId);
    if (!hasSelected) {
      const defaultOption =
        shippingOptions.find((option) => option.id === 'correios-pac') || shippingOptions[0];
      setSelectedShippingId(defaultOption.id);
    }
  }, [selectedAddressId, selectedShippingId, shippingOptions]);

  const selectedShipping =
    shippingOptions.find((option) => option.id === selectedShippingId) || null;
  const estimatedGrandTotal = total + (selectedShipping?.price || 0);

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
                      <label>CEP *</label>
                      <input
                        value={addressForm.zipCode}
                        onChange={(event) =>
                          setAddressForm((prev) => ({ ...prev, zipCode: formatCep(event.target.value) }))
                        }
                        placeholder="00000-000"
                        inputMode="numeric"
                        maxLength={9}
                      />
                      <div className="cep-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={handleCepLookup}
                          disabled={isCepLoading}
                        >
                          {isCepLoading ? 'Buscando...' : 'Buscar CEP'}
                        </button>
                      </div>
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
                    <button className="btn" onClick={handleSaveAddress} disabled={isSavingAddress}>
                      {isSavingAddress ? 'Salvando...' : 'SALVAR ENDEREÇO'}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="section-title section-title-top">Método de Pagamento</div>
            <div className="payment-sim">
              <div className="text-dim fs-sm mb-2">
                Pagamento via AbacatePay (PIX ou Cartão). Você será redirecionado para o checkout.
              </div>
            </div>
          </div>

          <div className="order-summary">
            <div className="section-title">Resumo do Pedido</div>

            <div className="shipping-sim-card">
              <div className="shipping-sim-head">
                <div className="shipping-sim-title">Frete e prazo</div>
                {selectedAddress && (
                  <div className={`shipping-source-chip ${shippingSource === 'api' ? 'api' : 'local'}`}>
                    {shippingSource === 'api' ? 'Cotação via API' : 'Estimativa local'}
                  </div>
                )}
              </div>
              {!selectedAddress ? (
                <div className="shipping-sim-hint">Selecione um endereço para ver o frete estimado.</div>
              ) : isShippingLoading ? (
                <div className="shipping-sim-hint">Calculando opções de frete...</div>
              ) : (
                <>
                  <div className="shipping-sim-cep">CEP: {selectedAddress.zipCode}</div>
                  <div className="shipping-options-grid">
                    {shippingOptions.map((option) => (
                      <button
                        key={option.id}
                        className={`shipping-option ${selectedShippingId === option.id ? 'selected' : ''}`}
                        type="button"
                        onClick={() => setSelectedShippingId(option.id)}
                      >
                        <span className="shipping-option-row">
                          <span className="shipping-option-label">{option.label}</span>
                          <span className="shipping-option-price">
                            {option.price === 0 ? 'Grátis' : formatCurrency(option.price)}
                          </span>
                        </span>
                        <span className="shipping-option-meta">{option.etaText}</span>
                        <span className="shipping-option-meta muted">Estimativa: {option.etaDateText}</span>
                      </button>
                    ))}
                  </div>
                  <div className="shipping-sim-note">
                    {shippingSource === 'api'
                      ? 'Valores e prazos retornados pela API de frete.'
                      : 'Valores e prazos são estimativas locais. A confirmação acontece no checkout de pagamento.'}
                  </div>
                </>
              )}
            </div>

            {items.map((item) => (
              <div key={item.productId} className="summary-item">
                <span className="summary-item-name">{item.productName} <span className="text-muted">x{item.quantity}</span></span>
                <span className="summary-item-val">{formatCurrency(item.subTotal)}</span>
              </div>
            ))}

            {selectedShipping && (
              <div className="summary-item">
                <span className="summary-item-name">Frete estimado ({selectedShipping.label})</span>
                <span className="summary-item-val">
                  {selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)}
                </span>
              </div>
            )}

            <div className="summary-total">
              <span className="summary-total-label">Total dos produtos</span>
              <span className="summary-total-val">{formatCurrency(total)}</span>
            </div>

            {selectedShipping && (
              <div className="summary-total summary-total-estimated">
                <span className="summary-total-label">Total estimado</span>
                <span className="summary-total-val">{formatCurrency(estimatedGrandTotal)}</span>
              </div>
            )}

            <div className="checkout-confirm-wrap">
              <button
                className="btn"
                onClick={handleConfirmOrder}
                disabled={isPlacingOrder || !selectedAddressId || isShippingLoading || !selectedShipping}
              >
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

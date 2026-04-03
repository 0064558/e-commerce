import React, { useEffect, useRef, useState } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import api from '../services/api';
import './AddressesPage.css';

function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
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
    setError('');
    try {
      const data = await api.getAddresses();
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
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

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remover este endereço?')) {
      return;
    }

    setError('');
    try {
      await api.deleteAddress(id);
      setAddresses((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || 'Falha ao remover endereço.');
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      await api.setDefaultAddress(id);
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Falha ao definir endereço padrão.');
    }
  };

  return (
    <div className="page addresses-page">
      <div className="container">
        <div className="page-header">
          <div className="page-title">ENDEREÇOS</div>
          <div className="page-sub">Gerencie seus endereços de entrega</div>
        </div>

        <Alert type="error" message={error} />

        {isLoading ? (
          <Spinner text="Carregando endereços..." />
        ) : addresses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏠</div>
            <div className="empty-state-text">Nenhum endereço cadastrado.</div>
          </div>
        ) : (
          <>
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
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
                    <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(address.id)}>
                      Definir como padrão
                    </button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAddress(address.id)}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

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
      </div>
    </div>
  );
}

export default AddressesPage;

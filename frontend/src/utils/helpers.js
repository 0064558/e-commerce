// Format currency to BRL
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
};

// Format date
export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('pt-BR');
};

// Status labels mapping
export const statusLabels = {
  WAITING_PAYMENT: 'Aguard. Pagamento',
  PAID: 'Pago',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELED: 'Cancelado',
};

// Get status label
export const getStatusLabel = (status) => {
  return statusLabels[status] || status;
};

// Custom hook for local storage
export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = require('react').useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = require('react').useCallback((val) => {
    setValue(val);
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key]);

  return [value, setStoredValue];
};

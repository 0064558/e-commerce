import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import './AdminPanelPage.css';

const SECTION_CONFIG = {
  usuarios: { title: 'Usuários', endpoint: 'GET /users' },
  pedidos: { title: 'Pedidos', endpoint: 'GET /orders' },
  produtos: { title: 'Produtos', endpoint: 'GET /products' },
  categorias: { title: 'Categorias', endpoint: 'GET /categories' },
};

const ORDER_STATUS_LABELS = {
  WAITING_PAYMENT: { cls: 'tag-waiting', label: 'Aguardando' },
  PAID: { cls: 'tag-paid', label: 'Pago' },
  SHIPPED: { cls: 'tag-shipped', label: 'Enviado' },
  DELIVERED: { cls: 'tag-delivered', label: 'Entregue' },
  CANCELED: { cls: 'tag-canceled', label: 'Cancelado' },
};

const ORDER_STATUS_OPTIONS = [
  { value: 'WAITING_PAYMENT', label: 'Aguardando pagamento' },
  { value: 'PAID', label: 'Pago' },
  { value: 'SHIPPED', label: 'Enviado' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'CANCELED', label: 'Cancelado' },
];

function normalizeTaxId(value) {
  return String(value || '').trim();
}

function formatCpf(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskTaxId(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return 'CPF não informado';
  return `XXX.XXX.XXX-${digits.slice(9)}`;
}

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getOrderSearchText(order) {
  const address = order?.address || {};
  const itemNames = Array.isArray(order?.items)
    ? order.items.map((item) => item?.productName || '').join(' ')
    : '';

  return normalizeSearch(
    [
      order?.id,
      order?.clientName,
      order?.clientEmail,
      order?.orderStatus,
      address.street,
      address.number,
      address.neighborhood,
      address.city,
      address.state,
      address.zipCode,
      order?.trackingCode,
      itemNames,
    ].join(' ')
  );
}

function getErrorMessage(err, fallback = 'Erro inesperado.') {
  return err?.message || fallback;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `R$ ${amount.toFixed(2)}`;
}

function Modal({ open, onClose, size = 'md', children }) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`modal ${size === 'sm' ? 'modal-sm' : ''}`}>{children}</div>
    </div>
  );
}

function AdminPanelPage({ user, onLogout, onGoStore }) {
  const [section, setSection] = useState('usuarios');
  const [requestInfo, setRequestInfo] = useState(null);
  const [toastState, setToastState] = useState(null);

  const [usersLoading, setUsersLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [lookupUserId, setLookupUserId] = useState('');
  const [lookupUserResult, setLookupUserResult] = useState(null);
  const [lookupUserError, setLookupUserError] = useState('');

  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    password: '',
    role: 'ADMIN',
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [editUserForm, setEditUserForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    taxId: '',
  });
  const [currentEditUserTaxId, setCurrentEditUserTaxId] = useState('');
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersSearch, setOrdersSearch] = useState('');
  const [editOrderForm, setEditOrderForm] = useState({
    id: '',
    orderStatus: 'WAITING_PAYMENT',
    trackingCode: '',
  });
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);

  const [productsLoading, setProductsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [createProductForm, setCreateProductForm] = useState({
    name: '',
    description: '',
    price: '',
    imgUrl: '',
    stockQuantity: 0,
    categories: [],
  });
  const [editProductForm, setEditProductForm] = useState({
    id: '',
    name: '',
    description: '',
    price: '',
    imgUrl: '',
    stockQuantity: 0,
    categories: [],
  });
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [createCategoryName, setCreateCategoryName] = useState('');
  const [editCategoryForm, setEditCategoryForm] = useState({ id: '', name: '' });
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null);

  const [activeModal, setActiveModal] = useState('');

  const showToast = (message, type = 'info') => {
    setToastState({ message, type });
  };

  useEffect(() => {
    if (!toastState) return undefined;
    const timer = window.setTimeout(() => {
      setToastState(null);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [toastState]);

  const setRequest = (method, path, status) => {
    setRequestInfo({ method, path, status });
  };

  const fetchCategoriesCache = async () => {
    try {
      const data = await api.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setCategories([]);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
      setRequest('GET', '/users', 200);
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao carregar usuários.'), 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await api.getOrders();
      setOrders(Array.isArray(data) ? data : []);
      setRequest('GET', '/orders', 200);
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao carregar pedidos.'), 'error');
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts()]);
      setCategories(Array.isArray(cats) ? cats : []);
      setProducts(Array.isArray(prods) ? prods : []);
      setRequest('GET', '/products', 200);
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao carregar produtos.'), 'error');
    } finally {
      setProductsLoading(false);
    }
  };

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(Array.isArray(data) ? data : []);
      setRequest('GET', '/categories', 200);
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao carregar categorias.'), 'error');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const categoriesData = await api.getCategories();
        if (mounted) {
          setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      }

      if (!mounted) return;

      setUsersLoading(true);
      try {
        const usersData = await api.getUsers();
        if (mounted) {
          setUsers(Array.isArray(usersData) ? usersData : []);
          setRequestInfo({ method: 'GET', path: '/users', status: 200 });
        }
      } catch (err) {
        if (mounted) {
          setToastState({
            message: getErrorMessage(err, 'Erro ao carregar usuários.'),
            type: 'error',
          });
        }
      } finally {
        if (mounted) {
          setUsersLoading(false);
        }
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = normalizeSearch(ordersSearch);
    if (!query) {
      return orders;
    }
    return orders.filter((order) => getOrderSearchText(order).includes(query));
  }, [orders, ordersSearch]);

  const currentSectionMeta = SECTION_CONFIG[section] || SECTION_CONFIG.usuarios;

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal('');

  const handleSectionChange = async (nextSection) => {
    setSection(nextSection);

    if (nextSection === 'usuarios') {
      await loadUsers();
      return;
    }
    if (nextSection === 'pedidos') {
      await loadOrders();
      return;
    }
    if (nextSection === 'produtos') {
      await loadProducts();
      return;
    }
    await loadCategories();
  };

  const findUserById = async () => {
    if (!lookupUserId) {
      setLookupUserError('Informe um ID para buscar.');
      setLookupUserResult(null);
      return;
    }

    try {
      const found = await api.getUserById(Number(lookupUserId));
      setLookupUserResult(found);
      setLookupUserError('');
      setRequest('GET', `/users/${lookupUserId}`, 200);
    } catch (err) {
      setLookupUserResult(null);
      setLookupUserError(getErrorMessage(err, 'Usuário não encontrado'));
      setRequest('GET', `/users/${lookupUserId}`, err?.status || 404);
    }
  };

  const resetCreateUserForm = () => {
    setCreateUserForm({
      name: '',
      email: '',
      phone: '',
      taxId: '',
      password: '',
      role: 'ADMIN',
    });
    setShowCreatePassword(false);
  };

  const createUser = async () => {
    if (!createUserForm.name || !createUserForm.email || !createUserForm.taxId || !createUserForm.password) {
      showToast('Preencha nome, email, CPF e senha.', 'error');
      return;
    }

    try {
      const created = await api.createUser({
        name: createUserForm.name.trim(),
        email: createUserForm.email.trim(),
        phone: createUserForm.phone.trim(),
        taxId: createUserForm.taxId.trim(),
        password: createUserForm.password,
        role: createUserForm.role,
      });

      setRequest('POST', '/auth/register', 200);
      showToast(`Usuário "${created?.name || createUserForm.name}" criado!`, 'success');
      resetCreateUserForm();
      closeModal();
      await loadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao criar usuário.'), 'error');
    }
  };

  const fetchUserTaxId = async (id) => {
    try {
      const details = await api.getUserById(id);
      return normalizeTaxId(details?.taxId);
    } catch {
      return '';
    }
  };

  const openEditUser = async (targetUser) => {
    const taxId = formatCpf(normalizeTaxId(targetUser?.taxId));
    const phone = formatPhone(targetUser?.phone || '');

    setEditUserForm({
      id: targetUser?.id || '',
      name: targetUser?.name || '',
      email: targetUser?.email || '',
      phone,
      taxId,
    });
    setCurrentEditUserTaxId(taxId);
    openModal('edit-user');

    if (!taxId && targetUser?.id) {
      const fetchedTaxId = await fetchUserTaxId(targetUser.id);
      const formattedTaxId = formatCpf(fetchedTaxId);
      setCurrentEditUserTaxId(formattedTaxId);
      setEditUserForm((prev) => ({ ...prev, taxId: formattedTaxId }));
    }
  };

  const updateUser = async () => {
    const id = editUserForm.id;
    if (!id) return;

    try {
      const typedTaxId = normalizeTaxId(editUserForm.taxId);
      const fallbackTaxId = currentEditUserTaxId || (await fetchUserTaxId(id));
      const finalTaxId = normalizeTaxId(typedTaxId || fallbackTaxId);

      if (!finalTaxId) {
        showToast('Informe o CPF para atualizar este usuário.', 'error');
        return;
      }

      const updated = await api.updateUser(id, {
        name: editUserForm.name.trim(),
        email: editUserForm.email.trim(),
        phone: editUserForm.phone.trim(),
        taxId: finalTaxId,
      });

      setRequest('PUT', `/users/${id}`, 200);
      showToast(`"${updated?.name || editUserForm.name}" atualizado!`, 'success');
      closeModal();
      await loadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao atualizar usuário.'), 'error');
    }
  };

  const deleteUser = async () => {
    if (!deleteUserTarget?.id) return;

    try {
      await api.deleteUser(deleteUserTarget.id);
      setRequest('DELETE', `/users/${deleteUserTarget.id}`, 204);
      showToast('Usuário deletado!', 'success');
      setDeleteUserTarget(null);
      closeModal();
      await loadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Usuário possui vínculos e não pode ser deletado.'), 'error');
      setDeleteUserTarget(null);
      closeModal();
    }
  };

  const openEditOrder = (targetOrder) => {
    setEditOrderForm({
      id: targetOrder?.id || '',
      orderStatus: targetOrder?.orderStatus || 'WAITING_PAYMENT',
      trackingCode: String(targetOrder?.trackingCode || '').trim(),
    });
    openModal('edit-order');
  };

  const updateOrder = async () => {
    if (!editOrderForm.id) return;

    const trackingCode = String(editOrderForm.trackingCode || '').trim();
    if (editOrderForm.orderStatus === 'SHIPPED' && !trackingCode) {
      showToast('Informe o código de rastreio para marcar o pedido como Enviado.', 'error');
      return;
    }

    try {
      await api.updateOrder(editOrderForm.id, {
        orderStatus: editOrderForm.orderStatus,
        trackingCode: trackingCode || null,
      });

      setRequest('PUT', `/orders/${editOrderForm.id}`, 200);
      showToast('Status atualizado!', 'success');
      closeModal();
      await loadOrders();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao atualizar pedido.'), 'error');
    }
  };

  const deleteOrder = async () => {
    if (!deleteOrderTarget?.id) return;

    try {
      await api.deleteOrder(deleteOrderTarget.id);
      setRequest('DELETE', `/orders/${deleteOrderTarget.id}`, 204);
      showToast(`Pedido #${deleteOrderTarget.id} deletado!`, 'success');
      setDeleteOrderTarget(null);
      closeModal();
      await loadOrders();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao deletar pedido.'), 'error');
      setDeleteOrderTarget(null);
      closeModal();
    }
  };

  const toggleCategoryInForm = (formState, formSetter, categoryId) => {
    const hasCategory = formState.categories.includes(categoryId);
    const nextCategories = hasCategory
      ? formState.categories.filter((id) => id !== categoryId)
      : [...formState.categories, categoryId];

    formSetter({ ...formState, categories: nextCategories });
  };

  const openCreateProductModal = async () => {
    if (!categories.length) {
      await fetchCategoriesCache();
    }

    setCreateProductForm({
      name: '',
      description: '',
      price: '',
      imgUrl: '',
      stockQuantity: 0,
      categories: [],
    });
    openModal('create-product');
  };

  const createProduct = async () => {
    if (!createProductForm.name || Number.isNaN(Number(createProductForm.price)) || createProductForm.price === '') {
      showToast('Preencha nome e preço.', 'error');
      return;
    }

    try {
      const created = await api.createProduct({
        name: createProductForm.name.trim(),
        description: createProductForm.description.trim(),
        price: Number(createProductForm.price),
        imgUrl: createProductForm.imgUrl.trim(),
        stockQuantity: Number(createProductForm.stockQuantity || 0),
        categories: createProductForm.categories.map((id) => ({ id })),
      });

      setRequest('POST', '/products', 200);
      showToast(`Produto "${created?.name || createProductForm.name}" criado!`, 'success');
      closeModal();
      await loadProducts();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao criar produto.'), 'error');
    }
  };

  const openEditProduct = async (targetProduct) => {
    if (!categories.length) {
      await fetchCategoriesCache();
    }

    setEditProductForm({
      id: targetProduct?.id || '',
      name: targetProduct?.name || '',
      description: targetProduct?.description || '',
      price: targetProduct?.price ?? '',
      imgUrl: targetProduct?.imgUrl || '',
      stockQuantity: targetProduct?.stockQuantity ?? 0,
      categories: (targetProduct?.categories || []).map((cat) => cat.id),
    });
    openModal('edit-product');
  };

  const updateProduct = async () => {
    if (!editProductForm.id) return;

    if (!editProductForm.name || Number.isNaN(Number(editProductForm.price)) || editProductForm.price === '') {
      showToast('Preencha nome e preço.', 'error');
      return;
    }

    try {
      const updated = await api.updateProduct(editProductForm.id, {
        name: editProductForm.name.trim(),
        description: editProductForm.description.trim(),
        price: Number(editProductForm.price),
        imgUrl: editProductForm.imgUrl.trim(),
        stockQuantity: Number(editProductForm.stockQuantity || 0),
        categories: editProductForm.categories.map((id) => ({ id })),
      });

      setRequest('PUT', `/products/${editProductForm.id}`, 200);
      showToast(`"${updated?.name || editProductForm.name}" atualizado!`, 'success');
      closeModal();
      await loadProducts();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao atualizar produto.'), 'error');
    }
  };

  const deleteProduct = async () => {
    if (!deleteProductTarget?.id) return;

    try {
      await api.deleteProduct(deleteProductTarget.id);
      setRequest('DELETE', `/products/${deleteProductTarget.id}`, 204);
      showToast('Produto deletado!', 'success');
      setDeleteProductTarget(null);
      closeModal();
      await loadProducts();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao deletar produto.'), 'error');
      setDeleteProductTarget(null);
      closeModal();
    }
  };

  const createCategory = async () => {
    const name = createCategoryName.trim();
    if (!name) {
      showToast('Preencha o nome.', 'error');
      return;
    }

    try {
      const created = await api.createCategory({ name });
      setRequest('POST', '/categories', 200);
      showToast(`Categoria "${created?.name || name}" criada!`, 'success');
      setCreateCategoryName('');
      closeModal();
      await loadCategories();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao criar categoria.'), 'error');
    }
  };

  const updateCategory = async () => {
    const id = editCategoryForm.id;
    const name = editCategoryForm.name.trim();

    if (!id) return;
    if (!name) {
      showToast('Preencha o nome.', 'error');
      return;
    }

    try {
      const updated = await api.updateCategory(id, { name });
      setRequest('PUT', `/categories/${id}`, 200);
      showToast(`Categoria renomeada para "${updated?.name || name}"!`, 'success');
      closeModal();
      await loadCategories();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao atualizar categoria.'), 'error');
    }
  };

  const deleteCategory = async () => {
    if (!deleteCategoryTarget?.id) return;

    try {
      await api.deleteCategory(deleteCategoryTarget.id);
      setRequest('DELETE', `/categories/${deleteCategoryTarget.id}`, 204);
      showToast('Categoria deletada!', 'success');
      setDeleteCategoryTarget(null);
      closeModal();
      await loadCategories();
    } catch (err) {
      showToast(getErrorMessage(err, 'Erro ao deletar categoria.'), 'error');
      setDeleteCategoryTarget(null);
      closeModal();
    }
  };

  const methodColor = {
    GET: '#22c55e',
    POST: '#7b8cf8',
    PUT: '#f59e0b',
    DELETE: '#ef4444',
  };

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <div className="logo-icon">S</div>
          <div>
            <div className="logo-title">Nexus Admin</div>
            <div className="logo-sub">localhost:8080</div>
          </div>
        </div>

        <nav>
          <div className="nav-section-label">Entidades</div>
          <button className={`nav-btn ${section === 'usuarios' ? 'active' : ''}`} onClick={() => handleSectionChange('usuarios')}>
            <span className="nav-icon">👥</span>
            Usuários
            <span className="nav-badge">/users</span>
          </button>
          <button className={`nav-btn ${section === 'pedidos' ? 'active' : ''}`} onClick={() => handleSectionChange('pedidos')}>
            <span className="nav-icon">📦</span>
            Pedidos
            <span className="nav-badge">/orders</span>
          </button>
          <button className={`nav-btn ${section === 'produtos' ? 'active' : ''}`} onClick={() => handleSectionChange('produtos')}>
            <span className="nav-icon">🛒</span>
            Produtos
            <span className="nav-badge">/products</span>
          </button>
          <button className={`nav-btn ${section === 'categorias' ? 'active' : ''}`} onClick={() => handleSectionChange('categorias')}>
            <span className="nav-icon">▦</span>
            Categorias
            <span className="nav-badge">/categories</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>{user?.email || 'Conectado'}</span>
          <button className="btn-store" onClick={onGoStore} title="Ir para loja" type="button">
            🏪
          </button>
          <button className="btn-logout" onClick={onLogout} title="Sair" type="button">
            ↩
          </button>
        </div>
      </aside>

      <div className="admin-layout">
        <header className="admin-header">
          <div className="header-left">
            <h1>{currentSectionMeta.title}</h1>
            <span className="endpoint-badge">{currentSectionMeta.endpoint}</span>
          </div>
          <div className="request-info">
            {requestInfo ? (
              <>
                <span style={{ color: methodColor[requestInfo.method], fontWeight: 500 }}>{requestInfo.method}</span>
                <span>{requestInfo.path}</span>
                <span style={{ color: requestInfo.status < 400 ? 'var(--green)' : 'var(--red)' }}>{requestInfo.status}</span>
              </>
            ) : (
              <span>Sem requisição recente</span>
            )}
          </div>
        </header>

        <main className="admin-main">
          {section === 'usuarios' && (
            <section>
              <div className="section-grid">
                <div>
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <h2>Usuários cadastrados</h2>
                        <span className="count-badge">{users.length}</span>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => openModal('create-user')}>
                        + Novo usuário
                      </button>
                    </div>

                    {usersLoading && (
                      <div className="loading-state">
                        <div className="spinner" />
                        <span>Carregando...</span>
                      </div>
                    )}

                    {!usersLoading && (
                      <ul className="data-list">
                        {users.length === 0 && <li className="empty-row">Nenhum usuário cadastrado</li>}
                        {users.map((targetUser) => (
                          <li key={targetUser.id}>
                            <div className="item-info">
                              <div className="item-name">
                                {targetUser.name}{' '}
                                {targetUser.role === 'ADMIN' ? (
                                  <span className="tag tag-admin">ADMIN</span>
                                ) : (
                                  <span className="tag tag-user">USER</span>
                                )}
                              </div>
                              <div className="item-sub">
                                {targetUser.email} · {targetUser.phone || 'Sem telefone'} · CPF: {maskTaxId(targetUser.taxId)}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="item-id">#{targetUser.id}</span>
                              <div className="item-actions">
                                <button className="btn-icon" onClick={() => openEditUser(targetUser)} title="Editar" type="button">
                                  ✏
                                </button>
                                <button
                                  className="btn-icon danger"
                                  onClick={() => {
                                    setDeleteUserTarget({ id: targetUser.id, name: targetUser.name });
                                    openModal('delete-user');
                                  }}
                                  title="Deletar"
                                  type="button"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div>
                  <div className="card">
                    <div className="card-header">
                      <h2>Buscar por ID</h2>
                      <span className="method-badge get">GET</span>
                    </div>
                    <div className="form-row">
                      <input
                        type="number"
                        min="1"
                        value={lookupUserId}
                        onChange={(event) => setLookupUserId(event.target.value)}
                        placeholder="Ex: 1"
                      />
                      <button className="btn btn-ghost" onClick={findUserById} type="button">
                        Buscar
                      </button>
                    </div>

                    {lookupUserError && <p className="result-error">{lookupUserError}</p>}
                    {lookupUserResult && (
                      <div className="result-box">
                        <div className="item-name">{lookupUserResult.name}</div>
                        <div className="item-sub" style={{ marginTop: 4 }}>
                          {lookupUserResult.email} · {lookupUserResult.phone || 'Sem telefone'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {section === 'pedidos' && (
            <section>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <h2>Pedidos</h2>
                    <span className="count-badge">
                      {filteredOrders.length === orders.length ? `${filteredOrders.length}` : `${filteredOrders.length}/${orders.length}`}
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label htmlFor="orders-search">Pesquisar pedidos</label>
                  <input
                    id="orders-search"
                    type="text"
                    value={ordersSearch}
                    onChange={(event) => setOrdersSearch(event.target.value)}
                    placeholder="Buscar por ID, cliente, e-mail, status, cidade ou CEP"
                  />
                </div>

                {ordersLoading && (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Carregando...</span>
                  </div>
                )}

                {!ordersLoading && (
                  <ul className="data-list">
                    {filteredOrders.length === 0 && <li className="empty-row">Nenhum pedido encontrado</li>}
                    {filteredOrders.map((order) => {
                      const statusInfo = ORDER_STATUS_LABELS[order.orderStatus] || {
                        cls: 'tag-waiting',
                        label: order.orderStatus,
                      };

                      const productsTotal = Number(order.productsTotal ?? order.total ?? order.totalAmount ?? 0);
                      const shippingAmount = Number(order.shippingAmount ?? 0);
                      const shippingLabel = order.shippingLabel || 'Frete';
                      const grandTotal = Number(order.grandTotal ?? productsTotal + shippingAmount);
                      const paymentLabel = order.paymentMoment ? 'Pago' : 'Pendente';
                      const dateLabel = order.moment ? String(order.moment).slice(0, 10) : '—';
                      const clientLabel = order.clientName || order.clientEmail || '—';
                      const addressText = order.address
                        ? `${order.address.street}, ${order.address.number} — ${order.address.city}/${order.address.state}`
                        : 'Sem endereço';
                      const trackingCode = String(order.trackingCode || '').trim();

                      return (
                        <li key={order.id} className="order-list-item">
                          <div className="order-head">
                            <div className="item-info">
                              <div className="item-name">Pedido #{order.id} — {clientLabel}</div>
                              <div className="item-sub">Total: {formatMoney(grandTotal)} · Pagamento: {paymentLabel} · {dateLabel}</div>
                              <div className="item-sub" style={{ marginTop: 2 }}>
                                Produtos: {formatMoney(productsTotal)} · {shippingLabel}: {shippingAmount === 0 ? 'Grátis' : formatMoney(shippingAmount)}
                              </div>
                              {trackingCode && (
                                <div className="item-sub" style={{ marginTop: 2 }}>
                                  Rastreio: <span className="item-id">{trackingCode}</span>
                                </div>
                              )}
                              <div className="item-sub" style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
                                📍 {addressText}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span className={`tag ${statusInfo.cls}`}>{statusInfo.label}</span>
                              <button className="btn-icon" onClick={() => openEditOrder(order)} title="Atualizar status" type="button">
                                ✏
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => {
                                  setDeleteOrderTarget({ id: order.id });
                                  openModal('delete-order');
                                }}
                                title="Deletar"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <div className="order-items-list">
                            {Array.isArray(order.items) && order.items.length > 0 ? (
                              order.items.map((item) => (
                                <div className="order-item" key={`${order.id}-${item.productId}-${item.productName}`}>
                                  <span>
                                    {item.productName} <span style={{ color: 'var(--muted)' }}>x{item.quantity}</span>
                                  </span>
                                  <span>{formatMoney(item.subTotal || 0)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="order-item">
                                <span style={{ color: 'var(--muted)' }}>Sem itens</span>
                              </div>
                            )}
                            <div className="order-item">
                              <span>Subtotal dos produtos</span>
                              <span>{formatMoney(productsTotal)}</span>
                            </div>
                            <div className="order-item">
                              <span>{shippingLabel}</span>
                              <span>{shippingAmount === 0 ? 'Grátis' : formatMoney(shippingAmount)}</span>
                            </div>
                            <div className="order-item" style={{ fontWeight: 700 }}>
                              <span>Total</span>
                              <span>{formatMoney(grandTotal)}</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {section === 'produtos' && (
            <section>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <h2>Produtos</h2>
                    <span className="count-badge">{products.length}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={openCreateProductModal}>
                    + Novo produto
                  </button>
                </div>

                {productsLoading && (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Carregando...</span>
                  </div>
                )}

                {!productsLoading && (
                  <ul className="data-list">
                    {products.length === 0 && <li className="empty-row">Nenhum produto encontrado</li>}
                    {products.map((product) => {
                      const categoryText = (product.categories || []).length
                        ? product.categories.map((cat) => cat.name).join(', ')
                        : 'Sem categoria';

                      return (
                        <li key={product.id}>
                          <div className="item-info">
                            <div className="item-name">{product.name}</div>
                            <div className="item-sub">{categoryText} · Estoque: {product.stockQuantity ?? '—'}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="item-id">{formatMoney(product.price)}</span>
                            <span className="item-id">#{product.id}</span>
                            <div className="item-actions">
                              <button className="btn-icon" onClick={() => openEditProduct(product)} title="Editar" type="button">
                                ✏
                              </button>
                              <button
                                className="btn-icon danger"
                                onClick={() => {
                                  setDeleteProductTarget({ id: product.id, name: product.name });
                                  openModal('delete-product');
                                }}
                                title="Deletar"
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {section === 'categorias' && (
            <section>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <h2>Categorias</h2>
                    <span className="count-badge">{categories.length}</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openModal('create-category')}>
                    + Nova categoria
                  </button>
                </div>

                {categoriesLoading && (
                  <div className="loading-state">
                    <div className="spinner" />
                    <span>Carregando...</span>
                  </div>
                )}

                {!categoriesLoading && (
                  <ul className="data-list">
                    {categories.length === 0 && <li className="empty-row">Nenhuma categoria encontrada</li>}
                    {categories.map((category) => (
                      <li key={category.id}>
                        <div className="item-name">{category.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="item-id">#{category.id}</span>
                          <div className="item-actions">
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditCategoryForm({ id: category.id, name: category.name });
                                openModal('edit-category');
                              }}
                              title="Editar"
                              type="button"
                            >
                              ✏
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => {
                                setDeleteCategoryTarget({ id: category.id, name: category.name });
                                openModal('delete-category');
                              }}
                              title="Deletar"
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <Modal open={activeModal === 'create-user'} onClose={closeModal}>
        <div className="modal-header">
          <h3>Novo usuário</h3>
          <span className="method-badge post">POST /auth/register</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={createUserForm.name}
            onChange={(event) => setCreateUserForm({ ...createUserForm, name: event.target.value })}
            placeholder="Maria Silva"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={createUserForm.email}
            onChange={(event) => setCreateUserForm({ ...createUserForm, email: event.target.value })}
            placeholder="maria@email.com"
          />
        </div>

        <div className="form-group">
          <label>Telefone</label>
          <input
            type="text"
            value={createUserForm.phone}
            onChange={(event) => setCreateUserForm({ ...createUserForm, phone: formatPhone(event.target.value) })}
            placeholder="11999999999"
          />
        </div>

        <div className="form-group">
          <label>CPF</label>
          <input
            type="text"
            value={createUserForm.taxId}
            onChange={(event) => setCreateUserForm({ ...createUserForm, taxId: formatCpf(event.target.value) })}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="form-group">
          <label>Senha</label>
          <input
            type={showCreatePassword ? 'text' : 'password'}
            value={createUserForm.password}
            onChange={(event) => setCreateUserForm({ ...createUserForm, password: event.target.value })}
            placeholder="••••••"
          />
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 6 }}
            onClick={() => setShowCreatePassword((prev) => !prev)}
            type="button"
          >
            {showCreatePassword ? 'Ocultar senha' : 'Mostrar senha'}
          </button>
        </div>

        <div className="form-group">
          <label>Perfil</label>
          <select
            value={createUserForm.role}
            onChange={(event) => setCreateUserForm({ ...createUserForm, role: event.target.value })}
          >
            <option value="ADMIN">Admin</option>
            <option value="USER">Usuário</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={createUser} type="button">
            Criar usuário
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'edit-user'} onClose={closeModal}>
        <div className="modal-header">
          <h3>Editar usuário</h3>
          <span className="method-badge put">PUT /users/{editUserForm.id || '...'}</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={editUserForm.name}
            onChange={(event) => setEditUserForm({ ...editUserForm, name: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={editUserForm.email}
            onChange={(event) => setEditUserForm({ ...editUserForm, email: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Telefone</label>
          <input
            type="text"
            value={editUserForm.phone}
            onChange={(event) => setEditUserForm({ ...editUserForm, phone: formatPhone(event.target.value) })}
          />
        </div>

        <div className="form-group">
          <label>CPF</label>
          <input
            type="text"
            value={editUserForm.taxId}
            onChange={(event) => {
              const nextTaxId = formatCpf(event.target.value);
              setEditUserForm({ ...editUserForm, taxId: nextTaxId });
              setCurrentEditUserTaxId(normalizeTaxId(nextTaxId));
            }}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-warning" onClick={updateUser} type="button">
            Salvar alterações
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'delete-user'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Confirmar exclusão</h3>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>
        <p className="modal-text">
          Tem certeza que deseja deletar <strong>{deleteUserTarget?.name || ''}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={deleteUser} type="button">
            Deletar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'edit-order'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Atualizar status</h3>
          <span className="method-badge put">PUT /orders/{editOrderForm.id || '...'}</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select
            value={editOrderForm.orderStatus}
            onChange={(event) => setEditOrderForm({ ...editOrderForm, orderStatus: event.target.value })}
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {editOrderForm.orderStatus === 'SHIPPED' && (
          <div className="form-group tracking-input">
            <label htmlFor="edit-order-tracking-code">Código de rastreio</label>
            <input
              id="edit-order-tracking-code"
              type="text"
              value={editOrderForm.trackingCode}
              onChange={(event) => setEditOrderForm({ ...editOrderForm, trackingCode: event.target.value })}
              placeholder="Ex: BR123456789"
              maxLength={120}
            />
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-warning" onClick={updateOrder} type="button">
            Atualizar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'delete-order'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Confirmar exclusão</h3>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>
        <p className="modal-text">
          Tem certeza que deseja deletar o <strong>Pedido #{deleteOrderTarget?.id || ''}</strong>?
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={deleteOrder} type="button">
            Deletar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'create-product'} onClose={closeModal}>
        <div className="modal-header">
          <h3>Novo produto</h3>
          <span className="method-badge post">POST /products</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={createProductForm.name}
            onChange={(event) => setCreateProductForm({ ...createProductForm, name: event.target.value })}
            placeholder="Smart TV"
          />
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <input
            type="text"
            value={createProductForm.description}
            onChange={(event) => setCreateProductForm({ ...createProductForm, description: event.target.value })}
            placeholder="Descrição do produto"
          />
        </div>

        <div className="form-group">
          <label>Preço</label>
          <input
            type="number"
            step="0.01"
            value={createProductForm.price}
            onChange={(event) => setCreateProductForm({ ...createProductForm, price: event.target.value })}
            placeholder="99.90"
          />
        </div>

        <div className="form-group">
          <label>URL da imagem</label>
          <input
            type="text"
            value={createProductForm.imgUrl}
            onChange={(event) => setCreateProductForm({ ...createProductForm, imgUrl: event.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="form-group">
          <label>Estoque</label>
          <input
            type="number"
            min="0"
            value={createProductForm.stockQuantity}
            onChange={(event) => setCreateProductForm({ ...createProductForm, stockQuantity: event.target.value })}
            placeholder="0"
          />
        </div>

        <div className="form-group">
          <label>Categorias</label>
          <div className="checkbox-group">
            {categories.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>Nenhuma categoria disponível</span>}
            {categories.map((category) => (
              <label key={`create-cat-${category.id}`} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={createProductForm.categories.includes(category.id)}
                  onChange={() => toggleCategoryInForm(createProductForm, setCreateProductForm, category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={createProduct} type="button">
            Criar produto
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'edit-product'} onClose={closeModal}>
        <div className="modal-header">
          <h3>Editar produto</h3>
          <span className="method-badge put">PUT /products/{editProductForm.id || '...'}</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={editProductForm.name}
            onChange={(event) => setEditProductForm({ ...editProductForm, name: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <input
            type="text"
            value={editProductForm.description}
            onChange={(event) => setEditProductForm({ ...editProductForm, description: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Preço</label>
          <input
            type="number"
            step="0.01"
            value={editProductForm.price}
            onChange={(event) => setEditProductForm({ ...editProductForm, price: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>URL da imagem</label>
          <input
            type="text"
            value={editProductForm.imgUrl}
            onChange={(event) => setEditProductForm({ ...editProductForm, imgUrl: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Estoque</label>
          <input
            type="number"
            min="0"
            value={editProductForm.stockQuantity}
            onChange={(event) => setEditProductForm({ ...editProductForm, stockQuantity: event.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Categorias</label>
          <div className="checkbox-group">
            {categories.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>Nenhuma categoria disponível</span>}
            {categories.map((category) => (
              <label key={`edit-cat-${category.id}`} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={editProductForm.categories.includes(category.id)}
                  onChange={() => toggleCategoryInForm(editProductForm, setEditProductForm, category.id)}
                />
                {category.name}
              </label>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-warning" onClick={updateProduct} type="button">
            Salvar alterações
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'delete-product'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Confirmar exclusão</h3>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>
        <p className="modal-text">
          Tem certeza que deseja deletar <strong>{deleteProductTarget?.name || ''}</strong>?
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={deleteProduct} type="button">
            Deletar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'create-category'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Nova categoria</h3>
          <span className="method-badge post">POST /categories</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={createCategoryName}
            onChange={(event) => setCreateCategoryName(event.target.value)}
            placeholder="Ex: Roupas"
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={createCategory} type="button">
            Criar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'edit-category'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Editar categoria</h3>
          <span className="method-badge put">PUT /categories/{editCategoryForm.id || '...'}</span>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>

        <div className="form-group">
          <label>Nome</label>
          <input
            type="text"
            value={editCategoryForm.name}
            onChange={(event) => setEditCategoryForm({ ...editCategoryForm, name: event.target.value })}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-warning" onClick={updateCategory} type="button">
            Salvar
          </button>
        </div>
      </Modal>

      <Modal open={activeModal === 'delete-category'} onClose={closeModal} size="sm">
        <div className="modal-header">
          <h3>Confirmar exclusão</h3>
          <button className="modal-close" onClick={closeModal} type="button">
            ✕
          </button>
        </div>
        <p className="modal-text">
          Tem certeza que deseja deletar <strong>{deleteCategoryTarget?.name || ''}</strong>?
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={closeModal} type="button">
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={deleteCategory} type="button">
            Deletar
          </button>
        </div>
      </Modal>

      {toastState && (
        <div className={`toast ${toastState.type}`}>
          <div className="toast-dot" />
          {toastState.message}
        </div>
      )}
    </div>
  );
}

export default AdminPanelPage;

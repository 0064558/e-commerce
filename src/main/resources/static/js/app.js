// ── CACHE DE CATEGORIAS ─────────────────────────────────────
// Guarda as categorias em memória para não precisar buscar toda hora
let allCategories = []

function fetchCategories() {
  return fetch('/categories')
    .then(r => r.json())
    .then(cats => { allCategories = cats; return cats })
}

// ── NAVEGAÇÃO ──────────────────────────────────────────────
const sectionLoaders = {
  usuarios:   loadUsers,
  pedidos:    loadOrders,
  produtos:   loadProducts,
  categorias: loadCategories
}

const sectionTitles = {
  usuarios:   ['Usuários',   'GET /users'],
  pedidos:    ['Pedidos',    'GET /orders'],
  produtos:   ['Produtos',   'GET /products'],
  categorias: ['Categorias', 'GET /categories']
}

function navigate(name, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('section-' + name).classList.add('active')
  btn.classList.add('active')
  const [title, endpoint] = sectionTitles[name]
  document.getElementById('page-title').textContent    = title
  document.getElementById('page-endpoint').textContent = endpoint
  sectionLoaders[name]()
}

// ── USUÁRIOS ────────────────────────────────────────────────
function loadUsers() {
  showLoading('users-loading')
  fetch('/users')
    .then(r => r.json())
    .then(users => {
      hideLoading('users-loading')
      document.getElementById('users-count').textContent = users.length
      setRequestInfo('GET', '/users', 200)
      const lista = document.getElementById('lista-usuarios')
      lista.innerHTML = ''
      if (users.length === 0) {
        lista.innerHTML = '<li style="justify-content:center;color:var(--muted2)">Nenhum usuário cadastrado</li>'
        return
      }
      users.forEach(user => {
        const item = document.createElement('li')
        item.innerHTML = `
          <div class="item-info">
            <div class="item-name">${user.name}</div>
            <div class="item-sub">${user.email} · ${user.phone}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="item-id">#${user.id}</span>
            <div class="item-actions">
              <button class="btn-icon" onclick="openEdit(${user.id}, '${esc(user.name)}', '${esc(user.email)}', '${esc(user.phone)}')" title="Editar">✏</button>
              <button class="btn-icon danger" onclick="openDelete(${user.id}, '${esc(user.name)}')" title="Deletar">✕</button>
            </div>
          </div>`
        lista.appendChild(item)
      })
    })
    .catch(() => { hideLoading('users-loading'); toast('Erro ao carregar usuários', 'error') })
}

function findById() {
  const id = document.getElementById('input-id').value
  if (!id) return
  fetch('/users/' + id)
    .then(r => {
      if (!r.ok) throw new Error('Usuário não encontrado')
      setRequestInfo('GET', '/users/' + id, 200)
      return r.json()
    })
    .then(user => {
      document.getElementById('resultado').innerHTML = `
        <div class="result-box">
          <div class="item-name">${user.name}</div>
          <div class="item-sub" style="margin-top:4px">${user.email} · ${user.phone}</div>
        </div>`
    })
    .catch(err => {
      setRequestInfo('GET', '/users/' + id, 404)
      document.getElementById('resultado').innerHTML = `<p class="result-error">${err.message}</p>`
    })
}

function createUser() {
  const body = {
    name:     document.getElementById('create-name').value.trim(),
    email:    document.getElementById('create-email').value.trim(),
    phone:    document.getElementById('create-phone').value.trim(),
    password: document.getElementById('create-password').value
  }
  if (!body.name || !body.email) { toast('Preencha nome e email', 'error'); return }
  fetch('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error('Erro ao criar usuário'); setRequestInfo('POST', '/users', 201); return r.json() })
    .then(user => {
      closeModal('modal-create')
      clearForm('create-name', 'create-email', 'create-phone', 'create-password')
      toast(`Usuário "${user.name}" criado!`, 'success')
      loadUsers()
    })
    .catch(err => toast(err.message, 'error'))
}

function openEdit(id, name, email, phone) {
  document.getElementById('edit-id').value    = id
  document.getElementById('edit-name').value  = name
  document.getElementById('edit-email').value = email
  document.getElementById('edit-phone').value = phone
  document.getElementById('edit-badge').textContent = `PUT /users/${id}`
  openModal('modal-edit')
}

function updateUser() {
  const id   = document.getElementById('edit-id').value
  const body = {
    name:  document.getElementById('edit-name').value.trim(),
    email: document.getElementById('edit-email').value.trim(),
    phone: document.getElementById('edit-phone').value.trim()
  }
  fetch('/users/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error('Erro ao atualizar'); setRequestInfo('PUT', '/users/' + id, 200); return r.json() })
    .then(user => { closeModal('modal-edit'); toast(`"${user.name}" atualizado!`, 'success'); loadUsers() })
    .catch(err => toast(err.message, 'error'))
}

function openDelete(id, name) {
  document.getElementById('delete-id').value         = id
  document.getElementById('delete-name').textContent = name
  openModal('modal-delete')
}

function confirmDelete() {
  const id = document.getElementById('delete-id').value
  fetch('/users/' + id, { method: 'DELETE' })
    .then(r => {
      if (r.status === 404) throw new Error('Usuário não encontrado')
      if (r.status === 400) throw new Error('Usuário possui pedidos e não pode ser deletado')
      if (!r.ok) throw new Error('Erro ao deletar')
      setRequestInfo('DELETE', '/users/' + id, 204)
      closeModal('modal-delete')
      toast('Usuário deletado!', 'success')
      loadUsers()
    })
    .catch(err => { closeModal('modal-delete'); toast(err.message, 'error') })
}

// ── PEDIDOS ─────────────────────────────────────────────────
function loadOrders() {
  showLoading('orders-loading')
  fetch('/orders')
    .then(r => r.json())
    .then(orders => {
      hideLoading('orders-loading')
      document.getElementById('orders-count').textContent = orders.length
      setRequestInfo('GET', '/orders', 200)
      const list = document.getElementById('orders-list')
      list.innerHTML = ''

      const statusMap = {
        PAID:            { cls: 'tag-paid',      label: 'Pago' },
        WAITING_PAYMENT: { cls: 'tag-waiting',   label: 'Aguardando' },
        SHIPPED:         { cls: 'tag-shipped',   label: 'Enviado' },
        DELIVERED:       { cls: 'tag-delivered', label: 'Entregue' },
        CANCELED:        { cls: 'tag-canceled',  label: 'Cancelado' }
      }

      orders.forEach(order => {
        const status  = statusMap[order.orderStatus] || { cls: 'tag-waiting', label: order.orderStatus }
        const payment = order.payment ? 'Pago' : 'Pendente'

        const itemsHtml = order.items && order.items.length > 0
          ? order.items.map(i => `
              <div class="order-item">
                <span>${i.product.name} <span style="color:var(--muted)">x${i.quantity}</span></span>
                <span>R$ ${i.subTotal.toFixed(2)}</span>
              </div>`).join('')
          : '<div class="order-item"><span style="color:var(--muted)">Sem itens</span></div>'

        const item = document.createElement('li')
        item.style.cssText = 'flex-direction:column;align-items:flex-start;gap:10px'
        item.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
            <div class="item-info">
              <div class="item-name">Pedido #${order.id} — ${order.client.name}</div>
              <div class="item-sub">Total: R$ ${order.total.toFixed(2)} · Pagamento: ${payment} · ${order.moment.slice(0,10)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <span class="tag ${status.cls}">${status.label}</span>
              <button class="btn-icon" onclick="openEditOrder(${order.id}, '${order.orderStatus}')" title="Atualizar status">✏</button>
              <button class="btn-icon danger" onclick="openDeleteOrder(${order.id})" title="Deletar">✕</button>
            </div>
          </div>
          <div class="order-items-list">${itemsHtml}</div>`
        list.appendChild(item)
      })
    })
    .catch(() => { hideLoading('orders-loading'); toast('Erro ao carregar pedidos', 'error') })
}

function openEditOrder(id, currentStatus) {
  document.getElementById('edit-order-id').value          = id
  document.getElementById('edit-order-status').value      = currentStatus
  document.getElementById('edit-order-badge').textContent = `PUT /orders/${id}`
  openModal('modal-edit-order')
}

function updateOrder() {
  const id     = document.getElementById('edit-order-id').value
  const status = document.getElementById('edit-order-status').value
  fetch('/orders/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderStatus: status }) })
    .then(r => { if (!r.ok) throw new Error('Erro ao atualizar pedido'); return r.json() })
    .then(() => { closeModal('modal-edit-order'); toast('Status atualizado!', 'success'); loadOrders() })
    .catch(err => toast(err.message, 'error'))
}

function openDeleteOrder(id) {
  document.getElementById('delete-order-id').value          = id
  document.getElementById('delete-order-label').textContent = `Pedido #${id}`
  openModal('modal-delete-order')
}

function confirmDeleteOrder() {
  const id = document.getElementById('delete-order-id').value
  fetch('/orders/' + id, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('Erro ao deletar pedido'); closeModal('modal-delete-order'); toast(`Pedido #${id} deletado!`, 'success'); loadOrders() })
    .catch(err => { closeModal('modal-delete-order'); toast(err.message, 'error') })
}

// ── PRODUTOS ────────────────────────────────────────────────
function loadProducts() {
  showLoading('products-loading')
  // Busca categorias e produtos ao mesmo tempo
  Promise.all([fetchCategories(), fetch('/products').then(r => r.json())])
    .then(([, products]) => {
      hideLoading('products-loading')
      document.getElementById('products-count').textContent = products.length
      setRequestInfo('GET', '/products', 200)
      const list = document.getElementById('products-list')
      list.innerHTML = ''
      products.forEach(product => {
        const cats = product.categories && product.categories.length > 0
          ? product.categories.map(c => c.name).join(', ')
          : 'Sem categoria'
        const item = document.createElement('li')
        item.innerHTML = `
          <div class="item-info">
            <div class="item-name">${product.name}</div>
            <div class="item-sub">${cats}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="item-id">R$ ${product.price.toFixed(2)}</span>
            <span class="item-id">#${product.id}</span>
            <div class="item-actions">
              <button class="btn-icon" onclick="openEditProduct(${product.id})" title="Editar">✏</button>
              <button class="btn-icon danger" onclick="openDeleteProduct(${product.id}, '${esc(product.name)}')" title="Deletar">✕</button>
            </div>
          </div>`
        list.appendChild(item)
      })
      // Salva produtos para usar no openEditProduct
      window._products = products
    })
    .catch(() => { hideLoading('products-loading'); toast('Erro ao carregar produtos', 'error') })
}

function renderCheckboxes(containerId, allCats, selectedIds) {
  const container = document.getElementById(containerId)
  if (allCats.length === 0) {
    container.innerHTML = '<span style="color:var(--muted);font-size:12px">Nenhuma categoria disponível</span>'
    container.classList.add('empty')
    return
  }
  container.classList.remove('empty')
  container.innerHTML = allCats.map(cat => {
    const checked = selectedIds.includes(cat.id)
    return `
      <label class="checkbox-item ${checked ? 'checked' : ''}" id="chk-${containerId}-${cat.id}">
        <input type="checkbox" value="${cat.id}" ${checked ? 'checked' : ''}
          onchange="toggleCheckbox(this, 'chk-${containerId}-${cat.id}')">
        <span class="checkbox-dot">${checked ? '✓' : ''}</span>
        ${cat.name}
      </label>`
  }).join('')
}

function toggleCheckbox(input, labelId) {
  const label = document.getElementById(labelId)
  const dot   = label.querySelector('.checkbox-dot')
  if (input.checked) {
    label.classList.add('checked')
    dot.textContent = '✓'
  } else {
    label.classList.remove('checked')
    dot.textContent = ''
  }
}

function getCheckedCategories(containerId) {
  const checkboxes = document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)
  return Array.from(checkboxes).map(cb => ({ id: parseInt(cb.value) }))
}

function openCreateProductModal() {
  clearForm('create-product-name', 'create-product-description', 'create-product-price', 'create-product-imgurl')
  renderCheckboxes('create-product-categories', allCategories, [])
  openModal('modal-create-product')
}

function createProduct() {
  const categories = getCheckedCategories('create-product-categories')
  const body = {
    name:        document.getElementById('create-product-name').value.trim(),
    description: document.getElementById('create-product-description').value.trim(),
    price:       parseFloat(document.getElementById('create-product-price').value),
    imgUrl:      document.getElementById('create-product-imgurl').value.trim(),
    categories
  }
  if (!body.name || !body.price) { toast('Preencha nome e preço', 'error'); return }
  fetch('/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error('Erro ao criar produto'); return r.json() })
    .then(product => {
      closeModal('modal-create-product')
      toast(`Produto "${product.name}" criado!`, 'success')
      loadProducts()
    })
    .catch(err => toast(err.message, 'error'))
}

function openEditProduct(id) {
  const product = window._products.find(p => p.id === id)
  if (!product) return
  document.getElementById('edit-product-id').value          = id
  document.getElementById('edit-product-name').value        = product.name
  document.getElementById('edit-product-description').value = product.description || ''
  document.getElementById('edit-product-price').value       = product.price
  document.getElementById('edit-product-imgurl').value      = product.imgUrl || ''
  document.getElementById('edit-product-badge').textContent = `PUT /products/${id}`
  const selectedIds = (product.categories || []).map(c => c.id)
  renderCheckboxes('edit-product-categories', allCategories, selectedIds)
  openModal('modal-edit-product')
}

function updateProduct() {
  const id         = document.getElementById('edit-product-id').value
  const categories = getCheckedCategories('edit-product-categories')
  const body = {
    name:        document.getElementById('edit-product-name').value.trim(),
    description: document.getElementById('edit-product-description').value.trim(),
    price:       parseFloat(document.getElementById('edit-product-price').value),
    imgUrl:      document.getElementById('edit-product-imgurl').value.trim(),
    categories
  }
  fetch('/products/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error('Erro ao atualizar'); return r.json() })
    .then(product => { closeModal('modal-edit-product'); toast(`"${product.name}" atualizado!`, 'success'); loadProducts() })
    .catch(err => toast(err.message, 'error'))
}

function openDeleteProduct(id, name) {
  document.getElementById('delete-product-id').value         = id
  document.getElementById('delete-product-name').textContent = name
  openModal('modal-delete-product')
}

function confirmDeleteProduct() {
  const id = document.getElementById('delete-product-id').value
  fetch('/products/' + id, { method: 'DELETE' })
    .then(r => {
      if (r.status === 404) throw new Error('Produto não encontrado')
      if (r.status === 400) throw new Error('Produto possui pedidos e não pode ser deletado')
      if (!r.ok) throw new Error('Erro ao deletar')
      closeModal('modal-delete-product')
      toast('Produto deletado!', 'success')
      loadProducts()
    })
    .catch(err => { closeModal('modal-delete-product'); toast(err.message, 'error') })
}

// ── CATEGORIAS ──────────────────────────────────────────────
function loadCategories() {
  showLoading('categories-loading')
  fetchCategories()
    .then(categories => {
      hideLoading('categories-loading')
      document.getElementById('categories-count').textContent = categories.length
      setRequestInfo('GET', '/categories', 200)
      const list = document.getElementById('categories-list')
      list.innerHTML = ''
      categories.forEach(cat => {
        const item = document.createElement('li')
        item.innerHTML = `
          <div class="item-name">${cat.name}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="item-id">#${cat.id}</span>
            <div class="item-actions">
              <button class="btn-icon" onclick="openEditCategory(${cat.id}, '${esc(cat.name)}')" title="Editar">✏</button>
              <button class="btn-icon danger" onclick="openDeleteCategory(${cat.id}, '${esc(cat.name)}')" title="Deletar">✕</button>
            </div>
          </div>`
        list.appendChild(item)
      })
    })
    .catch(() => { hideLoading('categories-loading'); toast('Erro ao carregar categorias', 'error') })
}

function createCategory() {
  const name = document.getElementById('create-category-name').value.trim()
  if (!name) { toast('Preencha o nome', 'error'); return }
  fetch('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    .then(r => { if (!r.ok) throw new Error('Erro ao criar categoria'); return r.json() })
    .then(cat => {
      closeModal('modal-create-category')
      clearForm('create-category-name')
      toast(`Categoria "${cat.name}" criada!`, 'success')
      loadCategories()
    })
    .catch(err => toast(err.message, 'error'))
}

function openEditCategory(id, name) {
  document.getElementById('edit-category-id').value          = id
  document.getElementById('edit-category-name').value        = name
  document.getElementById('edit-category-badge').textContent = `PUT /categories/${id}`
  openModal('modal-edit-category')
}

function updateCategory() {
  const id   = document.getElementById('edit-category-id').value
  const name = document.getElementById('edit-category-name').value.trim()
  if (!name) { toast('Preencha o nome', 'error'); return }
  fetch('/categories/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    .then(r => { if (!r.ok) throw new Error('Erro ao atualizar categoria'); return r.json() })
    .then(cat => { closeModal('modal-edit-category'); toast(`Categoria renomeada para "${cat.name}"!`, 'success'); loadCategories() })
    .catch(err => toast(err.message, 'error'))
}

function openDeleteCategory(id, name) {
  document.getElementById('delete-category-id').value         = id
  document.getElementById('delete-category-name').textContent = name
  openModal('modal-delete-category')
}

function confirmDeleteCategory() {
  const id = document.getElementById('delete-category-id').value
  fetch('/categories/' + id, { method: 'DELETE' })
    .then(r => { if (!r.ok) throw new Error('Erro ao deletar categoria'); closeModal('modal-delete-category'); toast('Categoria deletada!', 'success'); loadCategories() })
    .catch(err => { closeModal('modal-delete-category'); toast(err.message, 'error') })
}

// ── HELPERS ─────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open') }
function closeModal(id) { document.getElementById(id).classList.remove('open') }
function clearForm(...ids) { ids.forEach(id => { document.getElementById(id).value = '' }) }
function showLoading(id)   { document.getElementById(id).classList.remove('hidden') }
function hideLoading(id)   { document.getElementById(id).classList.add('hidden') }

function esc(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')
}

function setRequestInfo(method, path, status) {
  const colors = { GET: '#22c55e', POST: '#7b8cf8', PUT: '#f59e0b', DELETE: '#ef4444' }
  document.getElementById('request-info').innerHTML = `
    <span style="color:${colors[method]};font-weight:500">${method}</span>
    <span>${path}</span>
    <span style="color:${status < 400 ? 'var(--green)' : 'var(--red)'}">${status}</span>`
}

let toastTimer
function toast(msg, type = 'info') {
  const el = document.getElementById('toast')
  el.innerHTML = `<div class="toast-dot"></div>${msg}`
  el.className = `toast ${type} show`
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500)
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open') })
})

// Ajusta o botão de novo produto para abrir o modal com checkboxes
document.querySelector('[onclick="openModal(\'modal-create-product\')"]')
  ?.setAttribute('onclick', 'openCreateProductModal()')

// Carrega ao iniciar
fetchCategories().then(() => loadUsers())

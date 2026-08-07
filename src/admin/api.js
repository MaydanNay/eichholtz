const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('admin_token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const fetchOptions = {
    cache: 'no-store',
    ...options,
    headers
  }

  const res = await fetch(`${API_BASE}${path}`, fetchOptions)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const fallback = res.status === 429 ? 'Слишком много попыток. Попробуйте позже.' : 'Ошибка запроса'
    throw new Error(data.error || fallback)
  }

  return data
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  getProducts: (collectionId) => {
    const qs = collectionId ? `?collection_id=${collectionId}` : ''
    return request(`/products${qs}`)
  },
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  getOrders: () => request('/orders'),
  createOrder: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  getClients: (q) => request(`/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getUsers: (q) => request(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  createClient: (data) => request('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id, data) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  submitInquiry: (data) =>
    fetch(`${API_BASE}/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(async (res) => {
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Ошибка запроса')
      return payload
    }),

  getNews: (published) => request(`/news${published ? '?published=1' : ''}`),
  getNewsItem: (id) => request(`/news/${id}`),
  createNews: (data) => request('/news', { method: 'POST', body: JSON.stringify(data) }),
  updateNews: (id, data) => request(`/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNews: (id) => request(`/news/${id}`, { method: 'DELETE' }),

  getSeasons: (published) => request(`/seasons${published ? '?published=1' : ''}`),
  createSeason: (data) => request('/seasons', { method: 'POST', body: JSON.stringify(data) }),
  updateSeason: (id, data) => request(`/seasons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSeason: (id) => request(`/seasons/${id}`, { method: 'DELETE' }),

  getCollections: (params) => {
    const qs = new URLSearchParams()
    if (params?.published) qs.set('published', '1')
    if (params?.season_id) qs.set('season_id', params.season_id)
    if (params?.kind) qs.set('kind', params.kind)
    const query = qs.toString()
    return request(`/collections${query ? `?${query}` : ''}`)
  },
  getCollection: (id) => request(`/collections/${id}`),
  createCollection: (data) => request('/collections', { method: 'POST', body: JSON.stringify(data) }),
  updateCollection: (id, data) => request(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCollection: (id) => request(`/collections/${id}`, { method: 'DELETE' }),

  getCategories: (published, collectionId = null, allForAdmin = false) => {
    const qs = new URLSearchParams()
    if (published) qs.set('published', '1')
    if (collectionId) qs.set('collection_id', collectionId)
    if (allForAdmin) qs.set('all_for_admin', '1')
    const query = qs.toString()
    return request(`/categories${query ? `?${query}` : ''}`)
  },
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  uploadImage: async (file, category = 'products') => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('category', category)

    const headers = {}
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE}/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.error || 'Ошибка загрузки')
    }

    return data
  },

  deleteUploadedImage: (url, except) =>
    request('/uploads', {
      method: 'DELETE',
      body: JSON.stringify({
        url,
        except: except || undefined,
      }),
    }),
  saveHomeCollections: (collections) =>
    request('/home-settings/collections', { method: 'POST', body: JSON.stringify({ collections }) }),
  saveHomeSeasons: (seasons) =>
    request('/home-settings/seasons', { method: 'POST', body: JSON.stringify({ seasons }) }),
  getHomeSettings: () => request('/home-settings/settings'),
  saveHomeSettings: (settings) =>
    request('/home-settings/settings', { method: 'POST', body: JSON.stringify({ settings }) }),
}

export function setToken(token) {
  localStorage.setItem('admin_token', token)
}

export function clearToken() {
  localStorage.removeItem('admin_token')
}

export function isLoggedIn() {
  return !!getToken()
}

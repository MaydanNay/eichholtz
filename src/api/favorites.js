const API_BASE = '/api'
const TOKEN_KEY = 'user_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || 'Ошибка запроса')
  }

  return data
}

export const favoritesApi = {
  list: () => request('/favorites'),
  add: (productId) =>
    request('/favorites', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
  remove: (productId) => request(`/favorites/${productId}`, { method: 'DELETE' }),
}

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
    const fallback = res.status === 429 ? 'Слишком много попыток. Попробуйте позже.' : 'Ошибка запроса'
    throw new Error(data.error || fallback)
  }

  return data
}

export const userAuth = {
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => request('/auth/me'),

  getMyOrders: () => request('/my-orders'),
}

export function setUserToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearUserToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function hasUserToken() {
  return !!getToken()
}

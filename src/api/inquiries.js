const API_BASE = '/api'
const TOKEN_KEY = 'user_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export async function submitInquiry(data) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}/inquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(payload.error || 'Ошибка запроса')
  return payload
}

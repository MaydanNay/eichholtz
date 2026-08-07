const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data
}

export function saveHomeCollections(collections) {
  const token = localStorage.getItem('admin_token')
  return request('/home-settings/collections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ collections }),
  })
}

export function saveHomeSeasons(seasons) {
  const token = localStorage.getItem('admin_token')
  return request('/home-settings/seasons', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ seasons }),
  })
}

export function getHomeSettings() {
  return request('/home-settings/settings')
}

export function saveHomeSettings(settings) {
  const token = localStorage.getItem('admin_token')
  return request('/home-settings/settings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ settings }),
  })
}

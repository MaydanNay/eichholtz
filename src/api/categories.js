const API_BASE = '/api'

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data
}

export function getCategories(published = true, collectionId = null) {
  const params = new URLSearchParams()
  if (published) params.append('published', '1')
  if (collectionId) params.append('collection_id', collectionId)
  
  const qs = params.toString()
  return request(`/categories${qs ? '?' + qs : ''}`)
}

export function getCategory(id) {
  return request(`/categories/${id}`)
}

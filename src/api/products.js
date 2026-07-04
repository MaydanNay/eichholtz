const API_BASE = '/api'

export async function getProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Товар не найден')
  return data
}

export async function getProducts({ collectionId, catalogId, categoryId, q, limit, published = true } = {}) {
  const params = new URLSearchParams()
  if (collectionId) params.set('collection_id', String(collectionId))
  if (catalogId) params.set('catalog_id', String(catalogId))
  if (categoryId) params.set('category_id', String(categoryId))
  if (q?.trim()) params.set('q', q.trim())
  if (limit) params.set('limit', String(limit))
  if (published) params.set('published', '1')

  const qs = params.toString()
  const res = await fetch(`${API_BASE}/products${qs ? `?${qs}` : ''}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data
}

export async function searchProducts(query, limit = 8) {
  return getProducts({ q: query, limit })
}

const API_BASE = '/api'

export async function getProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Товар не найден')
  return data
}

function normalizeProductsResponse(data) {
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, limit: data.length, facets: null }
  }
  if (data && Array.isArray(data.items)) {
    return {
      items: data.items,
      total: Number(data.total) || data.items.length,
      page: Number(data.page) || 1,
      limit: Number(data.limit) || data.items.length,
      sort: data.sort || 'newest',
      facets: data.facets || null,
    }
  }
  if (data && Array.isArray(data.products)) {
    return { items: data.products, total: data.products.length, page: 1, limit: data.products.length, facets: null }
  }
  return { items: [], total: 0, page: 1, limit: 0, facets: null }
}

export async function getProducts({
  collectionId,
  catalogId,
  categoryId,
  q,
  limit,
  page,
  sort,
  specs,
  includeFacets = false,
  published = true,
} = {}) {
  const params = new URLSearchParams()
  if (collectionId) params.set('collection_id', String(collectionId))
  if (catalogId) params.set('catalog_id', String(catalogId))
  if (categoryId) params.set('category_id', String(categoryId))
  if (q?.trim()) params.set('q', q.trim())
  if (limit) params.set('limit', String(limit))
  if (page) params.set('page', String(page))
  if (sort) params.set('sort', String(sort))
  if (specs && Object.keys(specs).length > 0) params.set('specs', JSON.stringify(specs))
  if (includeFacets) params.set('include_facets', '1')
  if (published) params.set('published', '1')

  const qs = params.toString()
  const res = await fetch(`${API_BASE}/products${qs ? `?${qs}` : ''}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')

  // Paginated requests always return { items, total }. Legacy callers get a plain array.
  if (page) return normalizeProductsResponse(data)
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.products)) return data.products
  return []
}

export async function searchProducts(query, limit = 8) {
  return getProducts({ q: query, limit })
}

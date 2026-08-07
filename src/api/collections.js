const API_BASE = '/api'

async function request(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка загрузки')
  return data
}

export function getSeasons(published = true, showOnHome = false) {
  const params = new URLSearchParams()
  if (published) params.set('published', '1')
  if (showOnHome) params.set('show_on_home', '1')
  const qs = params.toString()
  return request(`/seasons${qs ? `?${qs}` : ''}`)
}

export function getCollections({ published = true, seasonId, kind = 'category', isNew = false } = {}) {
  const params = new URLSearchParams()
  if (published) params.set('published', '1')
  if (seasonId) params.set('season_id', String(seasonId))
  if (kind) params.set('kind', kind)
  if (isNew) params.set('is_new', '1')
  const qs = params.toString()
  return request(`/collections${qs ? `?${qs}` : ''}`)
}

export function getHomeCollections() {
  return request('/collections?published=1&kind=category&show_on_home=1')
}

export function getHeroCollections() {
  return request('/collections?published=1&kind=category&hero=1')
}

export function getCollection(id) {
  return request(`/collections/${id}`)
}

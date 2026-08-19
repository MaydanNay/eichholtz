/** Shared product sort helpers (catalog list + category PDF). */

export const ALGOLIA_PATH_BY_ROOT_ID = {
  551: 'Collection /// Furniture',
  585: 'Collection /// Lighting',
  595: 'Collection /// Accessories',
  578: 'Collection /// Outdoor',
}

export const ALGOLIA_PATH_BY_COLLECTION_ID = {
  124: 'Collection /// New /// New Arrivals',
  125: 'Collection /// New /// January 2026 Collection',
  128: 'Collection /// New /// Corey Damen Jenkins',
}

export const ALGOLIA_PATH_BY_COLLECTION_NAME = {
  'New Arrivals': 'Collection /// New /// New Arrivals',
  'January 2026 Collection': 'Collection /// New /// January 2026 Collection',
  'Corey Damen Jenkins': 'Collection /// New /// Corey Damen Jenkins',
}

export const SORT_SQL = {
  price_asc: 'p.price ASC NULLS LAST, p.id DESC',
  price_desc: 'p.price DESC NULLS LAST, p.id DESC',
  name_asc: 'p.name ASC NULLS LAST, p.id DESC',
  name_desc: 'p.name DESC NULLS LAST, p.id DESC',
}

function launchOrderExpr(dir) {
  return `CASE
      WHEN COALESCE(p.specs->>'item_collection_launch', '') ~ '^[0-9]+$'
      THEN (p.specs->>'item_collection_launch')::bigint
      ELSE NULL
    END ${dir} NULLS LAST`
}

function objectIdOrderExpr(dir) {
  return `CASE
      WHEN COALESCE(p.specs->>'objectID', p.specs->>'objectid', '') ~ '^[0-9]+$'
      THEN COALESCE(p.specs->>'objectID', p.specs->>'objectid')::bigint
      ELSE NULL
    END ${dir} NULLS LAST`
}

function algoliaStockOrderExpr() {
  return `(CASE
      WHEN COALESCE(p.specs->>'algolia_nav_available', '') = 'Out of Stock' THEN 1
      ELSE 0
    END) ASC`
}

/** Pins are path-scoped with stable positions (Algolia Query Rules). */
export function buildOrderSql(sortKey, params, promotedPath) {
  if (sortKey !== 'newest' && sortKey !== 'oldest') {
    return SORT_SQL[sortKey] || SORT_SQL.price_asc
  }
  const dir = sortKey === 'newest' ? 'DESC' : 'ASC'
  const parts = []
  if (promotedPath) {
    params.push(promotedPath)
    const pathParam = `$${params.length}`
    parts.push(
      `(CASE WHEN COALESCE(p.specs->'algolia_pin_rank'->>${pathParam}, '') ~ '^[0-9]+$' THEN 1 ELSE 0 END) ${dir}`,
    )
    parts.push(
      `(CASE WHEN COALESCE(p.specs->'algolia_pin_rank'->>${pathParam}, '') ~ '^[0-9]+$' THEN (p.specs->'algolia_pin_rank'->>${pathParam})::int ELSE NULL END) ASC NULLS LAST`,
    )
  }
  parts.push(algoliaStockOrderExpr())
  parts.push(launchOrderExpr(dir))
  parts.push(objectIdOrderExpr(dir))
  parts.push(`p.created_at ${dir} NULLS LAST`)
  parts.push(`p.id ${dir}`)
  return parts.join(',\n    ')
}

export async function resolveAlgoliaPathForCategoryFilter(categoryIdQuery, query) {
  if (!categoryIdQuery) return null
  let id = Number(String(categoryIdQuery).split(',')[0])
  if (!Number.isFinite(id)) return null
  for (let depth = 0; depth < 12; depth += 1) {
    if (ALGOLIA_PATH_BY_ROOT_ID[id]) return ALGOLIA_PATH_BY_ROOT_ID[id]
    const { rows } = await query('SELECT parent_id FROM categories WHERE id = $1', [id])
    const parentId = rows[0]?.parent_id
    if (parentId == null) break
    id = Number(parentId)
  }
  return ALGOLIA_PATH_BY_ROOT_ID[id] || null
}

export async function resolveAlgoliaPathForCollectionFilter(collectionIdQuery, query) {
  if (!collectionIdQuery) return null
  const id = Number(collectionIdQuery)
  if (Number.isFinite(id) && ALGOLIA_PATH_BY_COLLECTION_ID[id]) {
    return ALGOLIA_PATH_BY_COLLECTION_ID[id]
  }
  if (!Number.isFinite(id)) return null
  const { rows } = await query('SELECT name FROM collections WHERE id = $1', [id])
  const name = String(rows[0]?.name || '').trim()
  return ALGOLIA_PATH_BY_COLLECTION_NAME[name] || null
}

export async function resolveAlgoliaPromotedPath(req, query) {
  const fromCategory = await resolveAlgoliaPathForCategoryFilter(req.query.category_id, query)
  if (fromCategory) return fromCategory
  return resolveAlgoliaPathForCollectionFilter(req.query.collection_id, query)
}

export function buildNewestOrderSql(params, promotedPath) {
  return buildOrderSql('newest', params, promotedPath)
}

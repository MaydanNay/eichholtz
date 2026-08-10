/**
 * Backfill from Algolia (sort metadata only — does NOT touch categories / p.in_stock):
 * - specs.item_collection_launch
 * - specs.objectID (if missing)
 * - specs.algolia_nav_available (In Stock / Almost in Stock / Out of Stock)
 * - specs.algolia_promoted_in: string[] of level1 paths where the SKU is a leading pin
 *
 * Usage: node server/scripts/sync-item-collection-launch.js
 */
import { query, initDb, closePool } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const INDEX = 'live_magento2_en_products'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const ROOT_LEVEL1 = [
  'Collection /// Furniture',
  'Collection /// Lighting',
  'Collection /// Accessories',
  'Collection /// Outdoor',
]

async function getApiKey() {
  const res = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': UA },
  })
  const html = await res.text()
  const m = html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  if (!m) throw new Error('Algolia apiKey not found')
  return m[1]
}

async function algoliaQuery(key, body) {
  const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Algolia ${res.status}`)
  return res.json()
}

async function collectFromLevel2(key) {
  const launchBySku = new Map()
  const objectIdBySku = new Map()
  const navBySku = new Map()

  const facets = await algoliaQuery(key, {
    query: '',
    hitsPerPage: 0,
    facets: ['categories.level2'],
    maxValuesPerFacet: 200,
    analytics: false,
  })
  const level2 = Object.keys(facets.facets?.['categories.level2'] || {})
  console.log(`level2 facets: ${level2.length}`)

  for (const path of level2) {
    let page = 0
    while (true) {
      const data = await algoliaQuery(key, {
        query: '',
        hitsPerPage: 100,
        page,
        facetFilters: [[`categories.level2:${path}`]],
        attributesToRetrieve: ['sku', 'item_collection_launch', 'objectID', 'nav_available'],
        analytics: false,
      })
      for (const hit of data.hits || []) {
        const sku = String(hit.sku || '').trim()
        if (!sku) continue
        if (hit.objectID != null) objectIdBySku.set(sku, String(hit.objectID))
        if (hit.item_collection_launch != null && hit.item_collection_launch !== '') {
          const normalized = String(hit.item_collection_launch).replace(/\D/g, '')
          if (normalized) launchBySku.set(sku, normalized)
        }
        if (hit.nav_available != null && String(hit.nav_available).trim()) {
          navBySku.set(sku, String(hit.nav_available).trim())
        }
      }
      const hits = data.hits || []
      if (!hits.length || page + 1 >= (data.nbPages || 0) || page >= 20) break
      page += 1
    }
  }

  return { launchBySku, objectIdBySku, navBySku }
}

/**
 * Map sku -> Set of level1 paths where the SKU is a *leading* Query Rule pin.
 * Algolia can also pin items mid-list (still rankingInfo.promoted=true); those must
 * NOT float to the top — only the consecutive promoted prefix matches Relevance.
 */
async function collectPromotedByPath(key) {
  const promotedBySku = new Map()
  for (const path of ROOT_LEVEL1) {
    const data = await algoliaQuery(key, {
      query: '',
      hitsPerPage: 50,
      page: 0,
      facetFilters: [[`categories.level1:${path}`]],
      attributesToRetrieve: ['sku'],
      getRankingInfo: true,
      analytics: false,
    })
    const prefix = []
    for (const hit of data.hits || []) {
      if (!(hit._rankingInfo || {}).promoted) break
      const sku = String(hit.sku || '').trim()
      if (!sku) break
      prefix.push(sku)
    }
    console.log(`prefix pins ${path}:`, prefix)
    for (const sku of prefix) {
      if (!promotedBySku.has(sku)) promotedBySku.set(sku, new Set())
      promotedBySku.get(sku).add(path)
    }
  }
  return promotedBySku
}

async function patchSpec(sku, patch) {
  const { rowCount } = await query(
    `UPDATE products
     SET specs = COALESCE(specs, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE specs->>'sku' = $1`,
    [sku, JSON.stringify(patch)],
  )
  return rowCount
}

async function main() {
  await initDb()
  console.log('=== SYNC Algolia sort metadata (path-scoped pins) ===')
  const key = await getApiKey()

  const { launchBySku, objectIdBySku, navBySku } = await collectFromLevel2(key)
  console.log(
    `launch SKUs: ${launchBySku.size}, objectID SKUs: ${objectIdBySku.size}, nav SKUs: ${navBySku.size}`,
  )
  const navCounts = {}
  for (const v of navBySku.values()) navCounts[v] = (navCounts[v] || 0) + 1
  console.log('nav_available counts', navCounts)

  const promotedBySku = await collectPromotedByPath(key)
  console.log(
    `promoted SKUs: ${promotedBySku.size}`,
    [...promotedBySku.entries()].slice(0, 12).map(([sku, paths]) => [sku, [...paths]]),
  )

  // Drop legacy global flag; reset path-scoped pins (re-applied below)
  await query(
    `UPDATE products
     SET specs = (specs - 'algolia_promoted' - 'algolia_promoted_in'),
         updated_at = NOW()
     WHERE specs ? 'algolia_promoted' OR specs ? 'algolia_promoted_in'`,
  )

  let updated = 0
  const skus = new Set([
    ...launchBySku.keys(),
    ...objectIdBySku.keys(),
    ...navBySku.keys(),
    ...promotedBySku.keys(),
  ])
  let i = 0
  for (const sku of skus) {
    i += 1
    const patch = {}
    if (launchBySku.has(sku)) patch.item_collection_launch = launchBySku.get(sku)
    if (objectIdBySku.has(sku)) patch.objectID = objectIdBySku.get(sku)
    if (navBySku.has(sku)) patch.algolia_nav_available = navBySku.get(sku)
    if (promotedBySku.has(sku)) patch.algolia_promoted_in = [...promotedBySku.get(sku)]
    if (!Object.keys(patch).length) continue
    updated += await patchSpec(sku, patch)
    if (i % 500 === 0) console.log(`… ${i}/${skus.size}`)
  }

  const { rows } = await query(
    `SELECT
       count(*) FILTER (WHERE specs ? 'item_collection_launch') AS with_launch,
       count(*) FILTER (WHERE specs ? 'objectID') AS with_oid,
       count(*) FILTER (WHERE specs->>'algolia_nav_available' = 'Out of Stock') AS oos,
       count(*) FILTER (WHERE specs ? 'algolia_promoted_in') AS with_pins,
       count(*) FILTER (WHERE specs ? 'algolia_promoted') AS legacy_promo,
       count(*) AS total
     FROM products WHERE published`,
  )
  console.log('updated row touches:', updated)
  console.log('stats', rows[0])
  await closePool()
}

main().catch(async (err) => {
  console.error(err)
  try { await closePool() } catch {}
  process.exit(1)
})

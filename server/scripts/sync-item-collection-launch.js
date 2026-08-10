/**
 * Backfill from Algolia (sort metadata only — does NOT touch categories / p.in_stock):
 * - specs.item_collection_launch
 * - specs.objectID (if missing)
 * - specs.algolia_nav_available (In Stock / Almost in Stock / Out of Stock)
 * - specs.algolia_pin_rank: { [algoliaPath]: 1-based position }
 * - specs.algolia_promoted_in: string[] of paths (compat / debugging)
 *
 * Usage: node server/scripts/sync-item-collection-launch.js
 */
import { query, initDb, closePool } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const INDEX = 'live_magento2_en_products'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Ranking sources for Relevance-like sort.
 * - mode "prefix": only consecutive leading Query Rule pins (big category roots)
 * - mode "full": entire Algolia browse order (collections with mid-list pins)
 */
const PIN_QUERIES = [
  {
    path: 'Collection /// Furniture',
    facetFilters: [['categories.level1:Collection /// Furniture']],
    mode: 'prefix',
  },
  {
    path: 'Collection /// Lighting',
    facetFilters: [['categories.level1:Collection /// Lighting']],
    mode: 'prefix',
  },
  {
    path: 'Collection /// Accessories',
    facetFilters: [['categories.level1:Collection /// Accessories']],
    mode: 'prefix',
  },
  {
    path: 'Collection /// Outdoor',
    facetFilters: [['categories.level1:Collection /// Outdoor']],
    mode: 'prefix',
  },
  {
    path: 'Collection /// New /// New Arrivals',
    facetFilters: [['categories.level2:Collection /// New /// New Arrivals']],
    mode: 'full',
  },
  {
    path: 'Collection /// New /// January 2026 Collection',
    facetFilters: [['categories.level2:Collection /// New /// January 2026 Collection']],
    mode: 'full',
  },
  {
    path: 'Collection /// New /// Corey Damen Jenkins',
    facetFilters: [['categories.level2:Collection /// New /// Corey Damen Jenkins']],
    mode: 'full',
  },
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
 * Map sku -> { [path]: 1-based rank }.
 * prefix: consecutive promoted hits from the start only.
 * full: entire Algolia result order for that facet (needed when pins are mid-list).
 */
async function collectPinRanksByPath(key) {
  const ranksBySku = new Map()
  for (const { path, facetFilters, mode = 'prefix' } of PIN_QUERIES) {
    const ordered = []
    if (mode === 'full') {
      for (let page = 0; page < 40; page += 1) {
        const data = await algoliaQuery(key, {
          query: '',
          hitsPerPage: 50,
          page,
          facetFilters,
          attributesToRetrieve: ['sku'],
          getRankingInfo: true,
          analytics: false,
        })
        for (const hit of data.hits || []) {
          const sku = String(hit.sku || '').trim()
          if (sku) ordered.push(sku)
        }
        if (page + 1 >= (data.nbPages || 0)) break
      }
    } else {
      let stop = false
      for (let page = 0; page < 20 && !stop; page += 1) {
        const data = await algoliaQuery(key, {
          query: '',
          hitsPerPage: 50,
          page,
          facetFilters,
          attributesToRetrieve: ['sku'],
          getRankingInfo: true,
          analytics: false,
        })
        for (const hit of data.hits || []) {
          if (!(hit._rankingInfo || {}).promoted) {
            stop = true
            break
          }
          const sku = String(hit.sku || '').trim()
          if (!sku) {
            stop = true
            break
          }
          ordered.push(sku)
        }
        if (page + 1 >= (data.nbPages || 0)) break
      }
    }
    console.log(`${mode} ranks ${path}: ${ordered.length}`, ordered.slice(0, 8))
    ordered.forEach((sku, index) => {
      if (!ranksBySku.has(sku)) ranksBySku.set(sku, {})
      ranksBySku.get(sku)[path] = index + 1
    })
  }
  return ranksBySku
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
  console.log('=== SYNC Algolia sort metadata (path-scoped pin ranks) ===')
  const key = await getApiKey()

  const { launchBySku, objectIdBySku, navBySku } = await collectFromLevel2(key)
  console.log(
    `launch SKUs: ${launchBySku.size}, objectID SKUs: ${objectIdBySku.size}, nav SKUs: ${navBySku.size}`,
  )
  const navCounts = {}
  for (const v of navBySku.values()) navCounts[v] = (navCounts[v] || 0) + 1
  console.log('nav_available counts', navCounts)

  const ranksBySku = await collectPinRanksByPath(key)
  console.log(`pinned SKUs: ${ranksBySku.size}`)

  // Reset pin metadata; re-applied below for current leading pins only.
  await query(
    `UPDATE products
     SET specs = (specs - 'algolia_promoted' - 'algolia_promoted_in' - 'algolia_pin_rank'),
         updated_at = NOW()
     WHERE specs ? 'algolia_promoted'
        OR specs ? 'algolia_promoted_in'
        OR specs ? 'algolia_pin_rank'`,
  )

  let updated = 0
  const skus = new Set([
    ...launchBySku.keys(),
    ...objectIdBySku.keys(),
    ...navBySku.keys(),
    ...ranksBySku.keys(),
  ])
  let i = 0
  for (const sku of skus) {
    i += 1
    const patch = {}
    if (launchBySku.has(sku)) patch.item_collection_launch = launchBySku.get(sku)
    if (objectIdBySku.has(sku)) patch.objectID = objectIdBySku.get(sku)
    if (navBySku.has(sku)) patch.algolia_nav_available = navBySku.get(sku)
    if (ranksBySku.has(sku)) {
      const ranks = ranksBySku.get(sku)
      patch.algolia_pin_rank = ranks
      patch.algolia_promoted_in = Object.keys(ranks)
    }
    if (!Object.keys(patch).length) continue
    updated += await patchSpec(sku, patch)
    if (i % 500 === 0) console.log(`… ${i}/${skus.size}`)
  }

  const { rows } = await query(
    `SELECT
       count(*) FILTER (WHERE specs ? 'item_collection_launch') AS with_launch,
       count(*) FILTER (WHERE specs ? 'objectID') AS with_oid,
       count(*) FILTER (WHERE specs->>'algolia_nav_available' = 'Out of Stock') AS oos,
       count(*) FILTER (WHERE specs ? 'algolia_pin_rank') AS with_pin_rank,
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

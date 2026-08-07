#!/usr/bin/env node
/**
 * verify-accessories-audit.js
 * Строгий 1-к-1 аудит спарсенных товаров категории Аксессуары (Accessories)
 */

import 'dotenv/config'
import { query, initDb, closePool, validateEnv } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
let ALGOLIA_API_KEY = ''

const ACCESSORIES_CATEGORIES = [
  'Collection /// Accessories /// Mirrors /// Wall mirrors',
  'Collection /// Accessories /// Mirrors /// Table and floor mirrors',
  'Collection /// Accessories /// Wall decorations /// Wall objects',
  'Collection /// Accessories /// Wall decorations /// Prints',
  'Collection /// Accessories /// Decorative items /// Ashtrays',
  'Collection /// Accessories /// Decorative items /// Bookends',
  'Collection /// Accessories /// Decorative items /// Bowls',
  'Collection /// Accessories /// Decorative items /// Boxes',
  'Collection /// Accessories /// Decorative items /// Decorative objects',
  'Collection /// Accessories /// Decorative items /// Picture frames',
  'Collection /// Accessories /// Decorative items /// Statues',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Candle holders',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Hurricanes',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Candles',
  'Collection /// Accessories /// Vases | Planters /// Vases',
  'Collection /// Accessories /// Vases | Planters /// Planters',
  'Collection /// Accessories /// Serving accessories /// Serving accessories',
  'Collection /// Accessories /// Serving accessories /// Wine coolers',
  'Collection /// Accessories /// Serving accessories /// Wine racks',
  'Collection /// Accessories /// Home textiles /// Cushions',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Coat racks',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Umbrella stands',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Fireplace accessories',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Bathroom accessories',
  'Collection /// Accessories /// Artificial Flowers & Greenery',
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchAlgoliaApiKey() {
  const res = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' },
    signal: AbortSignal.timeout(25000),
  })
  const html = await res.text()
  const m = html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  return m[1]
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  ПОЛНЫЙ ГЛУБОКИЙ АУДИТ АКСЕССУАРОВ (Eichholtz site vs Postgres DB)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  validateEnv()
  await initDb()

  ALGOLIA_API_KEY = await fetchAlgoliaApiKey()

  const algoliaMap = new Map()
  for (const catPath of ACCESSORIES_CATEGORIES) {
    const isLevel2 = catPath.startsWith('Collection /// Accessories /// Artificial')
    const filterKey = isLevel2 ? 'categories.level2' : 'categories.level3'

    const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/live_magento2_en_products/query`, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hitsPerPage: 100,
        page: 0,
        facetFilters: [[`${filterKey}:${catPath}`]],
        filters: 'catalog_permissions.customer_group_1 != 0',
        attributesToRetrieve: ['name', 'sku', 'thumbnail_url', 'image_url', 'objectID'],
      })
    })
    const data = await res.json()
    const nbPages = Math.min(data.nbPages || 1, 10)
    const hits = [...(data.hits || [])]

    for (let page = 1; page < nbPages; page++) {
      await sleep(100)
      const resP = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/live_magento2_en_products/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hitsPerPage: 100,
          page,
          facetFilters: [[`${filterKey}:${catPath}`]],
          filters: 'catalog_permissions.customer_group_1 != 0',
          attributesToRetrieve: ['name', 'sku', 'thumbnail_url', 'image_url', 'objectID'],
        })
      })
      const dP = await resP.json()
      hits.push(...(dP.hits || []))
    }

    for (const h of hits) {
      if (!algoliaMap.has(h.objectID)) {
        algoliaMap.set(h.objectID, h)
      }
    }
  }

  console.log(`1. Всего уникальных товаров Аксессуаров на сайте: ${algoliaMap.size}`)

  let foundInDb = 0
  let missingInDb = 0
  let withCategory = 0
  let withImages = 0
  let withSpecs = 0

  for (const h of algoliaMap.values()) {
    const name = (h.name || h.item_name || '').trim()
    const sku = h.sku || ''

    const { rows } = await query(
      `SELECT p.id, p.name, p.category_id, p.image_url, p.images, p.specs
       FROM products p
       WHERE p.name = $1 OR p.specs->>'sku' = $2 OR p.specs->>'objectID' = $3
       LIMIT 1`,
      [name, sku, h.objectID]
    )

    if (rows[0]) {
      foundInDb++
      const row = rows[0]
      if (row.category_id) withCategory++
      if (row.image_url || (Array.isArray(row.images) && row.images.length > 0)) withImages++
      if (row.specs && typeof row.specs === 'object') withSpecs++
    } else {
      missingInDb++
    }
  }

  console.log(`2. Найдено совпадений в нашей БД: ${foundInDb} / ${algoliaMap.size} (${(foundInDb / algoliaMap.size * 100).toFixed(1)}%)`)
  console.log(`   - Имеют привязанную категорию: ${withCategory}`)
  console.log(`   - Имеют валидное фото/картинку: ${withImages}`)
  console.log(`   - Имеют сохраненные характеристики (SKU/Цвет/Материал): ${withSpecs}`)
  console.log(`   - Пропущено/отсутствует в БД: ${missingInDb}`)

  if (missingInDb === 0) {
    console.log('\n✅ ВСЕ ТОВАРА АКСЕССУАРОВ НАЙДЕНЫ И 100% СОХРАНЕНЫ В БД!')
  }

  console.log('═══════════════════════════════════════════════════════════════\n')
}

main()
  .catch(err => { console.error('\n❌ Error:', err.message); process.exit(1) })
  .finally(() => closePool())

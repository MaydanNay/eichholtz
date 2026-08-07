#!/usr/bin/env node
/**
 * scrape-new-only.js v2
 * Парсит ТОЛЬКО NEW коллекции с https://www.eichholtz.com/en/
 *
 * Стратегия multi-collection:
 *   Товар может принадлежать нескольким NEW коллекциям одновременно.
 *   collection_id = самая специфическая (наименьший nbHits в приоритете)
 *   specs.extra_collections = JSON массив ВСЕХ коллекций товара
 *
 * Запуск: docker cp ... && docker compose exec -T app node server/scripts/scrape-new-only.js
 */

import 'dotenv/config'
import { query, initDb, closePool, validateEnv } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
let ALGOLIA_API_KEY = ''

// Все актуальные NEW коллекции (проверено 23.07.2026)
// Порядок = приоритет при выборе основной collection_id (первые = самые специфичные/малые)
const NEW_QUERIES = [
  'Collection /// New /// Corey Damen Jenkins',            //  32 - самая специфичная
  'Collection /// New /// Maison Moghadam',                //   0
  'Collection /// New /// Natural Maximalism',            //  45
  'Collection /// New /// Bohemian Coastal',              //  38
  'Collection /// New /// Reflective Heritage',           //  38
  'Collection /// New /// High Point Market | April 2024', // 139
  'Collection /// New /// Timeless Revolution',           //  76
  'Collection /// New /// The Met x Eichholtz',           // 177
  'Collection /// New /// January 2026 Collection',       // 283
  'Collection /// New /// New Collection - September 2025', // 297
  'Collection /// New /// New Arrivals',                  // 279 - самая общая
]

// Algolia path → отображаемое название
const NEW_COLLECTION_MAP = {
  'Collection /// New /// New Arrivals':                       'New Arrivals',
  'Collection /// New /// January 2026 Collection':            'January 2026 Collection',
  'Collection /// New /// New Collection - September 2025':    'New Collection - September 2025',
  'Collection /// New /// The Met x Eichholtz':                'The Met x Eichholtz',
  'Collection /// New /// Corey Damen Jenkins':                'Corey Damen Jenkins',
  'Collection /// New /// Maison Moghadam':                    'Maison Moghadam',
  'Collection /// New /// High Point Market | April 2024':     'High Point Market | April 2024',
  'Collection /// New /// Timeless Revolution':                'Timeless Revolution',
  'Collection /// New /// Natural Maximalism':                 'Natural Maximalism',
  'Collection /// New /// Bohemian Coastal':                   'Bohemian Coastal',
  'Collection /// New /// Reflective Heritage':                'Reflective Heritage',
}

// Порядок отображения в UI
const SORT_ORDER = [
  'New Arrivals',
  'January 2026 Collection',
  'New Collection - September 2025',
  'The Met x Eichholtz',
  'Corey Damen Jenkins',
  'High Point Market | April 2024',
  'Timeless Revolution',
  'Natural Maximalism',
  'Bohemian Coastal',
  'Reflective Heritage',
  'Maison Moghadam',
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchAlgoliaApiKey() {
  const res = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0' },
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`Homepage fetch failed: ${res.status}`)
  const html = await res.text()
  const m = html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  if (!m) throw new Error('Could not find apiKey in homepage HTML')
  return m[1]
}

async function fetchNewCollection(categoryPath) {
  const ATTRS = ['name', 'sku', 'thumbnail_url', 'image_url', 'categories', 'objectID', 'item_name',
    'color', 'product_groupcode_filter', 'website_material_filter']

  const doRequest = async (page) => {
    const res = await fetch(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/live_magento2_en_products/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hitsPerPage: 100,
          page,
          facetFilters: [[`categories.level2:${categoryPath}`]],
          filters: 'catalog_permissions.customer_group_1 != 0',
          attributesToRetrieve: ATTRS,
        }),
        signal: AbortSignal.timeout(20000),
      }
    )
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`${res.status}: ${txt.substring(0, 150)}`)
    }
    return res.json()
  }

  const first = await doRequest(0)
  const nbPages = Math.min(first.nbPages || 1, 10)
  const totalHits = first.nbHits || 0
  const hits = [...first.hits]

  for (let page = 1; page < nbPages; page++) {
    await sleep(150)
    const data = await doRequest(page)
    hits.push(...data.hits)
  }

  const name = categoryPath.replace('Collection /// New /// ', '')
  console.log(`  [${totalHits} на сайте → ${hits.length} получено] ${name}`)
  return hits
}

// Определяем ВСЕ коллекции, которым принадлежит товар
function resolveAllCollections(hit) {
  const cats = hit.categories || {}
  const allPaths = [
    ...(cats.level1 || []),
    ...(cats.level2 || []),
    ...(cats.level3 || []),
  ]
  const collNames = []
  for (const p of allPaths) {
    if (NEW_COLLECTION_MAP[p]) {
      collNames.push(NEW_COLLECTION_MAP[p])
    }
  }
  return [...new Set(collNames)]
}

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  NEW Collections Re-scraper v2 (multi-collection)')
  console.log('═══════════════════════════════════════════════════════\n')

  validateEnv()
  await initDb()

  // 1. API key
  console.log('[1/5] Algolia API key...')
  ALGOLIA_API_KEY = await fetchAlgoliaApiKey()
  console.log(`  Key: ${ALGOLIA_API_KEY.substring(0, 20)}...`)

  // 2. Парсим все NEW коллекции — накапливаем по objectID все коллекции
  console.log('\n[2/5] Fetching NEW collections from Algolia...')

  // objectID → { hit, collections: Set<collName> }
  const hitMap = new Map()

  for (const catPath of NEW_QUERIES) {
    let hits
    try {
      hits = await fetchNewCollection(catPath)
    } catch (err) {
      console.warn(`  WARN [${catPath}]: ${err.message}`)
      hits = []
    }

    const primaryCollName = NEW_COLLECTION_MAP[catPath]

    for (const h of hits) {
      if (!hitMap.has(h.objectID)) {
        hitMap.set(h.objectID, { hit: h, primaryColl: primaryCollName, allColls: new Set() })
      }
      // Добавляем все коллекции из categories этого хита
      const allColls = resolveAllCollections(h)
      for (const c of allColls) {
        hitMap.get(h.objectID).allColls.add(c)
      }
      // Если primary ещё не назначена (первый раз встречаем) — запомним из этого запроса
      if (!hitMap.get(h.objectID).primaryColl) {
        hitMap.get(h.objectID).primaryColl = primaryCollName
      }
    }

    await sleep(200)
  }

  console.log(`\n  Уникальных товаров получено: ${hitMap.size}`)

  // Статистика по коллекциям
  const collCount = {}
  for (const { allColls } of hitMap.values()) {
    for (const c of allColls) {
      collCount[c] = (collCount[c] || 0) + 1
    }
  }
  console.log('  По коллекциям (все принадлежности):')
  for (const name of SORT_ORDER) {
    if (collCount[name]) console.log(`    ${name}: ${collCount[name]}`)
  }

  // 3. Очищаем существующий NEW сезон
  console.log('\n[3/5] Cleaning existing NEW season from DB...')
  const { rows: newSeasons } = await query(`SELECT id FROM seasons WHERE name = 'NEW'`)
  for (const { id } of newSeasons) {
    await query(`UPDATE products SET collection_id = NULL WHERE collection_id IN (SELECT id FROM collections WHERE season_id = $1)`, [id])
    await query(`DELETE FROM collections WHERE season_id = $1`, [id])
    await query(`DELETE FROM seasons WHERE id = $1`, [id])
    console.log(`  Deleted NEW season id=${id}`)
  }
  // Удаляем старые продукты NEW (без collection_id и category_id — они из NEW)
  const { rowCount: dpOld } = await query(`DELETE FROM products WHERE collection_id IS NULL AND category_id IS NULL AND catalog_id IS NULL`)
  if (dpOld > 0) console.log(`  Deleted ${dpOld} orphan NEW products`)

  // 4. Создаём сезон NEW и коллекции
  console.log('\n[4/5] Creating NEW season and collections...')
  const { rows: [season] } = await query(
    `INSERT INTO seasons (name, description, published, sort_order, show_on_home)
     VALUES ('NEW', 'Новые поступления и коллекции Eichholtz', true, -1, true)
     RETURNING id`
  )
  const seasonId = season.id
  console.log(`  Season "NEW" id=${seasonId}`)

  const collectionIdByName = {}
  for (const [i, name] of SORT_ORDER.entries()) {
    const { rows: [col] } = await query(
      `INSERT INTO collections (season_id, name, description, published, sort_order, kind, is_new)
       VALUES ($1, $2, '', true, $3, 'category', true) RETURNING id`,
      [seasonId, name, i + 1]
    )
    collectionIdByName[name] = col.id
    console.log(`  Collection: "${name}" id=${col.id}`)
  }

  // 5. Вставляем товары
  console.log(`\n[5/5] Inserting ${hitMap.size} products...`)
  let ok = 0, skip = 0
  let idx = 0

  for (const { hit: h, primaryColl, allColls } of hitMap.values()) {
    idx++
    const name = (h.name || h.item_name || '').trim()
    if (!name) { skip++; continue }

    // Основная коллекция = самая специфичная (первая по SORT_ORDER среди всех коллекций товара)
    let mainCollName = null
    for (const sortedName of SORT_ORDER) {
      if (allColls.has(sortedName)) {
        mainCollName = sortedName
        break
      }
    }
    // Если не нашли по SORT_ORDER — берём primaryColl
    if (!mainCollName) mainCollName = primaryColl

    const collectionId = mainCollName ? (collectionIdByName[mainCollName] || null) : null
    const extraColls = [...allColls].filter(c => c !== mainCollName)

    const imageUrl = h.thumbnail_url || h.image_url || ''
    const specs = {}
    if (h.color) specs.color = h.color
    if (h.website_material_filter) specs.material = h.website_material_filter
    if (h.product_groupcode_filter) specs.product_group = h.product_groupcode_filter
    if (extraColls.length > 0) specs.extra_collections = extraColls

    try {
      await query(
        `INSERT INTO products
           (name, description, price, image_url, images, specs, in_stock, published, collection_id, category)
         VALUES ($1, '', 0, $2, $3::jsonb, $4::jsonb, true, true, $5, '')`,
        [name, imageUrl, JSON.stringify(imageUrl ? [imageUrl] : []), JSON.stringify(specs), collectionId]
      )
      ok++
    } catch (err) {
      skip++
      if (skip <= 3) console.warn(`\n  WARN insert "${name}": ${err.message}`)
    }

    if (idx % 100 === 0 || idx === hitMap.size) {
      process.stdout.write(`\r  ${idx}/${hitMap.size} ok:${ok} skip:${skip}`)
    }
  }
  console.log()

  // Статистика
  console.log('\n📊 Результат по коллекциям (основная):')
  const { rows: stats } = await query(`
    SELECT c.name, COUNT(p.id) as n
    FROM collections c
    LEFT JOIN products p ON p.collection_id = c.id
    WHERE c.season_id = $1
    GROUP BY c.id, c.name ORDER BY c.sort_order
  `, [seasonId])
  for (const r of stats) {
    const expected = collCount[r.name] || 0
    const mark = expected > 0 && parseInt(r.n) >= expected ? '✅' : (expected > 0 ? '⚠️ ' : '  ')
    console.log(`  ${mark} ${r.name}: ${r.n} (на сайте: ${expected})`)
  }

  const { rows: [total] } = await query(
    `SELECT COUNT(*) as n FROM products WHERE collection_id IN (SELECT id FROM collections WHERE season_id = $1)`,
    [seasonId]
  )
  console.log(`\nВсего в NEW: ${total.n} / ожидалось: ${hitMap.size}`)
  console.log(`Вставлено: ${ok}, пропущено: ${skip}`)
  console.log('\n✅ Done!')
}

main()
  .catch(err => { console.error('\n❌', err.message, '\n', err.stack); process.exit(1) })
  .finally(() => closePool())

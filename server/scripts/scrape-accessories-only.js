#!/usr/bin/env node
/**
 * scrape-accessories-only.js
 * Парсит ВСЕ ~749 товаров категории Аксессуары (Accessories) с https://www.eichholtz.com/en/
 * Сопоставляет с подкатегориями в БД (Зеркала, Вазы, Декоративные предметы, Подушки, Подсвечники и т.д.)
 */

import 'dotenv/config'
import { query, initDb, closePool, validateEnv } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
let ALGOLIA_API_KEY = ''

const ACCESSORIES_CATEGORIES = [
  // ── Зеркала ────────────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Mirrors /// Wall mirrors',               dbName: 'Настенные зеркала' },
  { path: 'Collection /// Accessories /// Mirrors /// Table and floor mirrors',    dbName: 'Настольные и напольные зеркала' },

  // ── Настенный декор ────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Wall decorations /// Wall objects',      dbName: 'Настенные объекты' },
  { path: 'Collection /// Accessories /// Wall decorations /// Prints',            dbName: 'Отпечатки' },

  // ── Декоративные предметы ──────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Decorative items /// Ashtrays',          dbName: 'Пепельницы' },
  { path: 'Collection /// Accessories /// Decorative items /// Bookends',          dbName: 'Подставки для книг' },
  { path: 'Collection /// Accessories /// Decorative items /// Bowls',             dbName: 'Боулз' },
  { path: 'Collection /// Accessories /// Decorative items /// Boxes',             dbName: 'Коробки' },
  { path: 'Collection /// Accessories /// Decorative items /// Decorative objects', dbName: 'Декоративные предметы' },
  { path: 'Collection /// Accessories /// Decorative items /// Picture frames',    dbName: 'Рамки для картин' },
  { path: 'Collection /// Accessories /// Decorative items /// Statues',           dbName: 'Статуи' },

  // ── Подсвечники & Свечи ─────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Candle holders', dbName: 'Подсвечники' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Hurricanes',     dbName: 'Ураганы' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Candles',        dbName: 'Свечи' },

  // ── Вазы & Кашпо ───────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Vases | Planters /// Vases',             dbName: 'Вазы' },
  { path: 'Collection /// Accessories /// Vases | Planters /// Planters',          dbName: 'Плантаторы' },

  // ── Сервировка ──────────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Serving accessories /// Serving accessories', dbName: 'Аксессуары для сервировки' },
  { path: 'Collection /// Accessories /// Serving accessories /// Wine coolers',   dbName: 'Охладители для вина' },
  { path: 'Collection /// Accessories /// Serving accessories /// Wine racks',     dbName: 'Винные стеллажи' },

  // ── Текстиль ───────────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Home textiles /// Cushions',             dbName: 'Подушки' },

  // ── Вешалки / Зонты / Камин ────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Coat racks',           dbName: 'Вешалки для одежды' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Umbrella stands',      dbName: 'Подставки для зонтов' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Fireplace accessories',dbName: 'Аксессуары для камина' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Bathroom accessories', dbName: 'Аксессуары для ванной комнаты' },

  // ── Цветы & Зелень ─────────────────────────────────────────────────────────
  { path: 'Collection /// Accessories /// Artificial Flowers & Greenery',          dbName: 'Искусственные цветы и зелень' },
  { path: 'Collection /// Accessories /// Artificial plants & flowers',          dbName: 'Искусственные цветы и зелень' },
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

async function buildCategoryMap() {
  const { rows } = await query(`SELECT id, name FROM categories`)
  const nameToId = {}
  for (const r of rows) nameToId[r.name] = r.id

  const map = {}
  for (const item of ACCESSORIES_CATEGORIES) {
    if (nameToId[item.dbName] !== undefined) {
      map[item.path] = { id: nameToId[item.dbName], name: item.dbName }
    } else {
      console.warn(`  ⚠️ Category NOT found in DB for: "${item.dbName}"`)
    }
  }
  return map
}

async function fetchCategoryProducts(categoryPath) {
  const ATTRS = [
    'name', 'sku', 'thumbnail_url', 'image_url',
    'categories', 'objectID', 'item_name',
    'color', 'product_groupcode_filter', 'website_material_filter',
  ]
  const isLevel2 = categoryPath.startsWith('Collection /// Accessories /// Artificial')
  const filterKey = isLevel2 ? 'categories.level2' : 'categories.level3'

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
          facetFilters: [[`${filterKey}:${categoryPath}`]],
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
  const hits = [...first.hits]

  for (let page = 1; page < nbPages; page++) {
    await sleep(150)
    const data = await doRequest(page)
    hits.push(...data.hits)
  }

  return { hits, totalOnSite: first.nbHits || 0 }
}

function resolveCategory(hit, catMap) {
  const cats = hit.categories || {}
  const allPaths = [
    ...(cats.level3 || []),
    ...(cats.level2 || []),
    ...(cats.level1 || []),
  ]

  for (const item of ACCESSORIES_CATEGORIES) {
    if (allPaths.includes(item.path) && catMap[item.path]) {
      return catMap[item.path]
    }
  }

  return null
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Eichholtz Accessories (Аксессуары) Scraper v1')
  console.log('═══════════════════════════════════════════════════════════\n')

  validateEnv()
  await initDb()

  // 1. Карта категорий
  console.log('[1/4] Loading category map from DB...')
  const catMap = await buildCategoryMap()
  console.log(`  Mapped ${Object.keys(catMap).length} categories`)

  // 2. API Key
  console.log('\n[2/4] Algolia API key...')
  ALGOLIA_API_KEY = await fetchAlgoliaApiKey()
  console.log(`  Key: ${ALGOLIA_API_KEY.substring(0, 20)}...`)

  // 3. Запрос товаров
  console.log('\n[3/4] Fetching Accessories products by category...')
  const uniqueHits = new Map() // objectID -> hit

  for (const item of ACCESSORIES_CATEGORIES) {
    const catPath = item.path
    try {
      const { hits, totalOnSite } = await fetchCategoryProducts(catPath)
      let added = 0
      for (const h of hits) {
        if (!uniqueHits.has(h.objectID)) {
          uniqueHits.set(h.objectID, h)
          added++
        }
      }
      console.log(`  [${totalOnSite} на сайте | +${added} новых] ${item.dbName} (${catPath.split('///').pop().trim()})`)
    } catch (err) {
      console.warn(`  WARN [${catPath}]: ${err.message}`)
    }
    await sleep(150)
  }

  console.log(`\n  Всего уникальных товаров Аксессуаров получено: ${uniqueHits.size}`)

  // 4. Импорт / Обновление в БД
  console.log(`\n[4/4] Processing and updating ${uniqueHits.size} products in DB...`)
  let updated = 0, inserted = 0, skipped = 0

  let idx = 0
  for (const h of uniqueHits.values()) {
    idx++
    const name = (h.name || h.item_name || '').trim()
    if (!name) { skipped++; continue }

    const dbCat = resolveCategory(h, catMap)
    const categoryId = dbCat ? dbCat.id : null
    const categoryName = dbCat ? dbCat.name : ''

    const imageUrl = h.thumbnail_url || h.image_url || ''
    const sku = h.sku || ''
    const specs = {}
    if (sku) specs.sku = sku
    if (h.objectID) specs.objectID = h.objectID
    if (h.color) specs.color = h.color
    if (h.website_material_filter) specs.material = h.website_material_filter
    if (h.product_groupcode_filter) specs.product_group = h.product_groupcode_filter

    let existingId = null
    let existingSpecs = {}

    const { rows: byName } = await query(
      `SELECT id, specs FROM products WHERE name = $1 LIMIT 1`,
      [name]
    )
    if (byName[0]) {
      existingId = byName[0].id
      existingSpecs = typeof byName[0].specs === 'object' ? byName[0].specs : {}
    } else if (sku) {
      const { rows: bySku } = await query(
        `SELECT id, specs FROM products WHERE specs->>'sku' = $1 LIMIT 1`,
        [sku]
      )
      if (bySku[0]) {
        existingId = bySku[0].id
        existingSpecs = typeof bySku[0].specs === 'object' ? bySku[0].specs : {}
      }
    }

    if (existingId) {
      const mergedSpecs = { ...existingSpecs, ...specs }
      await query(
        `UPDATE products
         SET category_id = $1,
             category = $2,
             specs = $3::jsonb,
             image_url = CASE WHEN (image_url IS NULL OR image_url = '') THEN $4 ELSE image_url END,
             updated_at = NOW()
         WHERE id = $5`,
        [categoryId, categoryName, JSON.stringify(mergedSpecs), imageUrl, existingId]
      )
      updated++
    } else {
      try {
        await query(
          `INSERT INTO products
             (name, description, price, image_url, images, specs, in_stock, published, category_id, category)
           VALUES ($1, '', 0, $2, $3::jsonb, $4::jsonb, true, true, $5, $6)`,
          [
            name,
            imageUrl,
            JSON.stringify(imageUrl ? [imageUrl] : []),
            JSON.stringify(specs),
            categoryId,
            categoryName,
          ]
        )
        inserted++
      } catch (err) {
        skipped++
        if (skipped <= 3) console.warn(`  WARN insert "${name}": ${err.message}`)
      }
    }

    if (idx % 100 === 0 || idx === uniqueHits.size) {
      process.stdout.write(`\r  ${idx}/${uniqueHits.size} updated:${updated} inserted:${inserted} skipped:${skipped}`)
    }
  }
  console.log()

  // Итоговая статистика по Аксессуарам
  console.log('\n📊 Итоговая статистика товаров Аксессуаров в БД по подкатегориям:')
  const { rows: stats } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE name = 'Аксессуары'
      UNION ALL
      SELECT c.id FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT c.name, COUNT(p.id) as n
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE c.id IN (SELECT id FROM cat_tree)
    GROUP BY c.id, c.name
    HAVING COUNT(p.id) > 0
    ORDER BY c.name
  `)

  for (const r of stats) {
    console.log(`  ${r.name}: ${r.n}`)
  }

  const { rows: [total] } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE name = 'Аксессуары'
      UNION ALL
      SELECT c.id FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT COUNT(DISTINCT id) as n FROM products WHERE category_id IN (SELECT id FROM cat_tree)
  `)

  console.log(`\nВсего товаров в категории Аксессуары: ${total.n}`)
  console.log(`Обновлено: ${updated}, Вставлено новых: ${inserted}, Пропущено: ${skipped}`)
  console.log('\n✅ Done!')
}

main()
  .catch(err => { console.error('\n❌', err.message, '\n', err.stack); process.exit(1) })
  .finally(() => closePool())

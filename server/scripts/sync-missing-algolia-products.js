#!/usr/bin/env node
/**
 * Sync missing products from live eichholtz.com Algolia into DB.
 * Also fills empty SKUs and assigns categories to uncategorized products.
 */
import { query, initDb, closePool } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const INDEX = 'live_magento2_en_products'

/** Most-specific path first → Russian DB category name */
const CATEGORY_PRIORITY = [
  // Furniture
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Modular sofas', dbName: 'Модульные диваны' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Ottomans', dbName: 'Османы' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Benches', dbName: 'Скамейки' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Chaise longues', dbName: 'Шезлонги' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Sofas', dbName: 'Диваны' },
  { path: 'Collection /// Furniture /// Chairs /// Armchairs', dbName: 'Кресла' },
  { path: 'Collection /// Furniture /// Chairs /// Dining chairs', dbName: 'Обеденные стулья' },
  { path: 'Collection /// Furniture /// Chairs /// Bar- & counterstools', dbName: 'Барные и кухонные стулья' },
  { path: 'Collection /// Furniture /// Chairs /// Stools', dbName: 'Стулья' },
  { path: 'Collection /// Furniture /// Tables /// Coffee tables', dbName: 'Кофейные столики' },
  { path: 'Collection /// Furniture /// Tables /// Side tables', dbName: 'Приставные столики' },
  { path: 'Collection /// Furniture /// Tables /// Console tables', dbName: 'Консольные столы' },
  { path: 'Collection /// Furniture /// Tables /// Dining tables', dbName: 'Обеденные столы' },
  { path: 'Collection /// Furniture /// Tables /// Desks', dbName: 'Столы' },
  { path: 'Collection /// Furniture /// Tables /// Trolleys', dbName: 'Тележки' },
  { path: 'Collection /// Furniture /// Tables /// Columns', dbName: 'Колонки' },
  { path: 'Collection /// Furniture /// Tables /// Bars | Butler trays', dbName: 'Барные стойки | Подносы для дворецкого' },
  { path: 'Collection /// Furniture /// Bedroom /// Headboards & beds', dbName: 'Изголовья и кровати' },
  { path: 'Collection /// Furniture /// Bedroom /// Nightstands', dbName: 'Прикроватные тумбочки' },
  { path: 'Collection /// Furniture /// Bedroom /// Drawer dressers', dbName: 'Комоды с ящиками' },
  { path: 'Collection /// Furniture /// Cabinets /// Display cabinets', dbName: 'Витрины' },
  { path: 'Collection /// Furniture /// Cabinets /// Dressers', dbName: 'Комоды' },
  { path: 'Collection /// Furniture /// Cabinets /// Bar cabinets', dbName: 'Барные шкафы' },
  { path: 'Collection /// Furniture /// Cabinets /// Tv Cabinets', dbName: 'Тумбы под телевизор' },
  { path: 'Collection /// Furniture /// Rugs | Carpets', dbName: 'Ковры | Ковровые покрытия' },
  { path: 'Collection /// Furniture /// Bedroom', dbName: 'Спальня' },
  { path: 'Collection /// Furniture /// Cabinets', dbName: 'Шкафы' },
  { path: 'Collection /// Furniture /// Chairs', dbName: 'Стулья' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans', dbName: 'Диваны | Банкетки' },
  { path: 'Collection /// Furniture /// Tables', dbName: 'Столы' },
  { path: 'Collection /// Furniture', dbName: 'Мебель' },

  // Lighting
  { path: 'Collection /// Lighting /// Chandeliers', dbName: 'Люстры' },
  { path: 'Collection /// Lighting /// Wall lamps', dbName: 'Бра' },
  { path: 'Collection /// Lighting /// Table lamps', dbName: 'Настольные лампы' },
  { path: 'Collection /// Lighting /// Floor lamps', dbName: 'Торшеры' },
  { path: 'Collection /// Lighting /// Ceiling lamps', dbName: 'Потолочные светильники' },
  { path: 'Collection /// Lighting /// Outdoor lighting', dbName: 'Уличное освещение' },
  { path: 'Collection /// Lighting /// LED bulbs', dbName: 'LED лампы' },
  { path: 'Collection /// Lighting /// Lamp shades', dbName: 'Абажуры' },
  { path: 'Collection /// Lighting /// Shades', dbName: 'Абажуры' },
  { path: 'Collection /// Lighting', dbName: 'Освещение' },

  // Accessories
  { path: 'Collection /// Accessories /// Mirrors /// Wall mirrors', dbName: 'Настенные зеркала' },
  { path: 'Collection /// Accessories /// Mirrors /// Table and floor mirrors', dbName: 'Настольные и напольные зеркала' },
  { path: 'Collection /// Accessories /// Wall decorations /// Wall objects', dbName: 'Настенные объекты' },
  { path: 'Collection /// Accessories /// Wall decorations /// Prints', dbName: 'Отпечатки' },
  { path: 'Collection /// Accessories /// Decorative items /// Ashtrays', dbName: 'Пепельницы' },
  { path: 'Collection /// Accessories /// Decorative items /// Bookends', dbName: 'Подставки для книг' },
  { path: 'Collection /// Accessories /// Decorative items /// Bowls', dbName: 'Боулз' },
  { path: 'Collection /// Accessories /// Decorative items /// Boxes', dbName: 'Коробки' },
  { path: 'Collection /// Accessories /// Decorative items /// Decorative objects', dbName: 'Декоративные предметы' },
  { path: 'Collection /// Accessories /// Decorative items /// Picture frames', dbName: 'Рамки для картин' },
  { path: 'Collection /// Accessories /// Decorative items /// Statues', dbName: 'Статуи' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Candle holders', dbName: 'Подсвечники' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Hurricanes', dbName: 'Ураганы' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders /// Candles', dbName: 'Свечи' },
  { path: 'Collection /// Accessories /// Vases | Planters /// Vases', dbName: 'Вазы' },
  { path: 'Collection /// Accessories /// Vases | Planters /// Planters', dbName: 'Плантаторы' },
  { path: 'Collection /// Accessories /// Serving accessories /// Serving accessories', dbName: 'Аксессуары для сервировки' },
  { path: 'Collection /// Accessories /// Serving accessories /// Wine coolers', dbName: 'Охладители для вина' },
  { path: 'Collection /// Accessories /// Serving accessories /// Wine racks', dbName: 'Винные стеллажи' },
  { path: 'Collection /// Accessories /// Home textiles /// Cushions', dbName: 'Подушки' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Coat racks', dbName: 'Вешалки для одежды' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Umbrella stands', dbName: 'Подставки для зонтов' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Fireplace accessories', dbName: 'Аксессуары для камина' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Bathroom accessories', dbName: 'Аксессуары для ванной' },
  { path: 'Collection /// Accessories /// Artificial Flowers & Greenery', dbName: 'Искусственные цветы и растения' },
  { path: 'Collection /// Accessories /// Mirrors', dbName: 'Зеркала' },
  { path: 'Collection /// Accessories /// Wall decorations', dbName: 'Настенные украшения' },
  { path: 'Collection /// Accessories /// Decorative items', dbName: 'Декоративные предметы' },
  { path: 'Collection /// Accessories /// Hurricanes | Candle holders', dbName: 'Подсвечники' },
  { path: 'Collection /// Accessories /// Vases | Planters', dbName: 'Вазы | Кашпо' },
  { path: 'Collection /// Accessories /// Serving accessories', dbName: 'Аксессуары для сервировки' },
  { path: 'Collection /// Accessories /// Home textiles', dbName: 'Домашний текстиль' },
  { path: 'Collection /// Accessories /// Coat racks | Umbrella stands & more', dbName: 'Вешалки для одежды | Подставки для зонтов' },
  { path: 'Collection /// Accessories', dbName: 'Аксессуары' },

  // Outdoor
  { path: 'Collection /// Outdoor /// Outdoor chairs /// Outdoor armchairs', dbName: 'Кресла для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor chairs /// Outdoor dining chairs', dbName: 'Обеденные стулья для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor tables /// Outdoor coffee tables', dbName: 'Кофейные столики на открытом воздухе' },
  { path: 'Collection /// Outdoor /// Outdoor tables /// Outdoor dining tables', dbName: 'Столы для обеда на открытом воздухе' },
  { path: 'Collection /// Outdoor /// Outdoor tables /// Outdoor side tables', dbName: 'Уличные столики' },
  { path: 'Collection /// Outdoor /// Outdoor tables /// Outdoor console tables', dbName: 'Уличные консольные столики' },
  { path: 'Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor sofas', dbName: 'Уличные диваны' },
  { path: 'Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor beds', dbName: 'Уличные кровати' },
  { path: 'Collection /// Outdoor /// Outdoor accessories', dbName: 'Аксессуары для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor carpets', dbName: 'Ковры для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor rugs', dbName: 'Ковры для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor lighting', dbName: 'Наружное освещение' },
  { path: 'Collection /// Outdoor /// Outdoor covers', dbName: 'Чехлы для уличной мебели' },
  { path: 'Collection /// Outdoor /// Outdoor chairs', dbName: 'Стулья для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor tables', dbName: 'Столы для улицы' },
  { path: 'Collection /// Outdoor /// Outdoor sofas | Daybeds', dbName: 'Диваны для улицы' },
  { path: 'Collection /// Outdoor', dbName: 'Уличная мебель' },
]

const ATTRS = [
  'name', 'sku', 'thumbnail_url', 'image_url', 'categories', 'objectID', 'item_name',
  'color', 'product_groupcode_filter', 'website_material_filter', 'finish', 'fabric',
  'price', 'description', 'meta_description',
]

function toHighResImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.replace(/\/cache\/[a-f0-9]+\//gi, '/')
}

function skuFromImage(url) {
  if (!url) return ''
  const m = String(url).match(/\/(\d{5,})(?:_\d+)?\.(?:jpe?g|png|webp)/i)
  return m ? m[1] : ''
}

async function fetchApiKey() {
  const res = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(30000),
  })
  const html = await res.text()
  const m = html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  if (!m) throw new Error('Algolia apiKey not found')
  return m[1]
}

async function algoliaQuery(apiKey, body) {
  const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`Algolia ${res.status}`)
  return res.json()
}

function ingestHit(map, hit) {
  const oid = String(hit.objectID || '')
  if (!oid) return
  const prev = map.get(oid)
  if (!prev) map.set(oid, hit)
}

async function collectCollectionHits(apiKey) {
  const map = new Map()
  const facetRes = await algoliaQuery(apiKey, {
    query: '',
    hitsPerPage: 0,
    facets: ['categories.level1', 'categories.level2', 'categories.level3'],
    maxValuesPerFacet: 1000,
  })
  const level1 = facetRes.facets?.['categories.level1'] || {}
  const collectionL1 = Object.keys(level1).filter((k) => k.startsWith('Collection ///') && k !== 'Collection /// New')

  for (const l1 of collectionL1) {
    const q2 = await algoliaQuery(apiKey, {
      query: '',
      hitsPerPage: 0,
      facets: ['categories.level2'],
      maxValuesPerFacet: 1000,
      facetFilters: [[`categories.level1:${l1}`]],
    })
    const l2all = q2.facets?.['categories.level2'] || {}
    const prefix = `${l1} ///`
    const children = Object.keys(l2all).filter((k) => k.startsWith(prefix))
    const l2list = children.length ? children : [null]

    for (const l2 of l2list) {
      const filters = l2 ? [[`categories.level2:${l2}`]] : [[`categories.level1:${l1}`]]
      const q3 = await algoliaQuery(apiKey, {
        query: '',
        hitsPerPage: 0,
        facets: ['categories.level3'],
        maxValuesPerFacet: 1000,
        facetFilters: filters,
      })
      const n = q3.nbHits || 0
      const l3all = q3.facets?.['categories.level3'] || {}
      const pref = `${l2 || l1} ///`
      const grandchildren = Object.keys(l3all).filter((k) => k.startsWith(pref))
      const buckets = n > 900 && grandchildren.length ? grandchildren : [null]

      for (const l3 of buckets) {
        const ff = l3 ? [[`categories.level3:${l3}`]] : filters
        let page = 0
        while (page < 8) {
          const data = await algoliaQuery(apiKey, {
            query: '',
            hitsPerPage: 1000,
            page,
            attributesToRetrieve: ATTRS,
            facetFilters: ff,
          })
          const hits = data.hits || []
          for (const h of hits) ingestHit(map, h)
          if (!hits.length || page + 1 >= (data.nbPages || 1)) break
          page += 1
        }
      }
    }
    console.log(`  collected ${l1}: total unique ${map.size}`)
  }
  return map
}

function resolveCategoryId(hit, pathToCat, roots) {
  const cats = hit.categories || {}
  const paths = []
  for (const lvl of ['level3', 'level2', 'level1', 'level0']) {
    const arr = cats[lvl]
    if (Array.isArray(arr)) paths.push(...arr)
  }
  for (const item of CATEGORY_PRIORITY) {
    if (paths.some((p) => p === item.path || p.startsWith(`${item.path} ///`))) {
      const cat = pathToCat[item.path]
      if (cat) return cat
    }
  }
  // fallback by root english word
  const joined = paths.join(' | ').toLowerCase()
  if (joined.includes('outdoor')) return roots.outdoor
  if (joined.includes('lighting')) return roots.lighting
  if (joined.includes('accessories')) return roots.accessories
  if (joined.includes('furniture')) return roots.furniture
  return roots.furniture
}

function buildSpecs(hit) {
  return {
    objectID: String(hit.objectID),
    sku: hit.sku ? String(hit.sku) : '',
    fabric: hit.fabric || '',
    finish: hit.finish || '',
    material: hit.website_material_filter || '',
    color: hit.color || '',
    product_group: hit.product_groupcode_filter || '',
    categories_without_path: hit.categories_without_path || [],
  }
}

async function run() {
  console.log('=== SYNC MISSING ALGOLIA PRODUCTS ===')
  await initDb()
  const apiKey = await fetchApiKey()

  const { rows: cats } = await query('SELECT id, name FROM categories')
  const nameToId = Object.fromEntries(cats.map((c) => [c.name, c.id]))
  const pathToCat = {}
  for (const item of CATEGORY_PRIORITY) {
    if (nameToId[item.dbName] != null) pathToCat[item.path] = nameToId[item.dbName]
  }
  const roots = {
    furniture: nameToId['Мебель'] || null,
    lighting: nameToId['Освещение'] || null,
    accessories: nameToId['Аксессуары'] || null,
    outdoor: nameToId['Уличная мебель'] || nameToId['Для улицы'] || null,
  }
  console.log('roots', roots)

  const algoliaMap = await collectCollectionHits(apiKey)
  console.log(`Algolia Collection unique: ${algoliaMap.size}`)

  const { rows: dbRows } = await query(`
    SELECT id, name, category_id, image_url, specs
    FROM products
  `)

  const bySku = new Map()
  const byObj = new Map()
  for (const p of dbRows) {
    const specs = typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : (p.specs || {})
    const sku = String(specs.sku || '').trim()
    const obj = String(specs.objectID || '').trim()
    if (sku) bySku.set(sku, p)
    if (obj) byObj.set(obj, p)
  }

  let inserted = 0
  let skuFilled = 0
  let catsAssigned = 0
  let skipped = 0

  for (const [objId, hit] of algoliaMap.entries()) {
    const sku = hit.sku ? String(hit.sku).trim() : ''
    const existing = byObj.get(objId) || (sku ? bySku.get(sku) : null)

    if (!existing) {
      const imageUrl = toHighResImageUrl(hit.image_url || hit.thumbnail_url || '')
      const categoryId = resolveCategoryId(hit, pathToCat, roots)
      const price = hit.price?.EUR?.default || hit.price_default || 0
      const name = hit.name || hit.item_name || 'Untitled'
      const description = hit.description || hit.meta_description || ''
      const specs = buildSpecs(hit)
      if (!specs.sku) specs.sku = skuFromImage(imageUrl) || objId

      const { rows } = await query(
        `INSERT INTO products (name, description, price, category_id, category, image_url, images, published, in_stock, specs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,$8)
         RETURNING id`,
        [
          name,
          description,
          price,
          categoryId,
          cats.find((c) => c.id === categoryId)?.name || '',
          imageUrl,
          JSON.stringify(imageUrl ? [imageUrl] : []),
          JSON.stringify(specs),
        ],
      )
      inserted += 1
      byObj.set(objId, { id: rows[0].id })
      if (specs.sku) bySku.set(specs.sku, { id: rows[0].id })
      continue
    }

    // Existing: fill sku / category if needed
    const specs = typeof existing.specs === 'string'
      ? JSON.parse(existing.specs || '{}')
      : { ...(existing.specs || {}) }
    let changed = false

    if (!String(specs.sku || '').trim()) {
      const filled = sku || skuFromImage(existing.image_url) || skuFromImage(hit.image_url)
      if (filled) {
        specs.sku = filled
        skuFilled += 1
        changed = true
      }
    }
    if (!specs.objectID) {
      specs.objectID = objId
      changed = true
    }

    if (!existing.category_id) {
      const categoryId = resolveCategoryId(hit, pathToCat, roots)
      if (categoryId) {
        await query(
          `UPDATE products SET category_id = $1, category = $2, specs = $3, updated_at = NOW() WHERE id = $4`,
          [categoryId, cats.find((c) => c.id === categoryId)?.name || '', JSON.stringify(specs), existing.id],
        )
        catsAssigned += 1
        skipped += 1
        continue
      }
    }

    if (changed) {
      await query(`UPDATE products SET specs = $1, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(specs),
        existing.id,
      ])
    } else {
      skipped += 1
    }
  }

  // Fill remaining empty SKUs from image URLs even if not in Algolia Collection set
  const { rows: emptySku } = await query(`
    SELECT id, image_url, specs
    FROM products
    WHERE NULLIF(TRIM(COALESCE(specs->>'sku','')), '') IS NULL
  `)
  let skuFromImg = 0
  for (const p of emptySku) {
    const sku = skuFromImage(p.image_url)
    if (!sku) continue
    const specs = typeof p.specs === 'string' ? JSON.parse(p.specs || '{}') : { ...(p.specs || {}) }
    specs.sku = sku
    await query(`UPDATE products SET specs = $1, updated_at = NOW() WHERE id = $2`, [
      JSON.stringify(specs),
      p.id,
    ])
    skuFromImg += 1
  }

  const { rows: stats } = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(DISTINCT NULLIF(TRIM(specs->>'sku'),''))::int AS distinct_sku,
      COUNT(*) FILTER (WHERE NULLIF(TRIM(COALESCE(specs->>'sku','')),'') IS NULL)::int AS empty_sku,
      COUNT(*) FILTER (WHERE category_id IS NULL)::int AS no_category
    FROM products
  `)

  console.log('\n=== DONE ===')
  console.log({ inserted, skuFilled, skuFromImg, catsAssigned, skipped, stats: stats[0] })
  await closePool()
}

run().catch(async (err) => {
  console.error(err)
  try { await closePool() } catch {}
  process.exit(1)
})

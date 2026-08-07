#!/usr/bin/env node
/**
 * scrape-eichholtz-com.js v3
 * Парсит ВСЕ ~2949 товаров с https://www.eichholtz.com/en/ через Algolia API
 * Использует per-subcategory запросы, чтобы обойти лимит 1000 хитов на API ключ.
 *
 * Запуск:
 *   docker run --rm --network eicholtz_default -v $(pwd):/app -w /app \
 *     -e DATABASE_URL=postgresql://eicholtz:eicholtz@db:5432/eicholtz \
 *     -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... -e JWT_SECRET=... \
 *     node:20-alpine node server/scripts/scrape-eichholtz-com.js --force
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, initDb, closePool, validateEnv } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const RAW_JSON = path.join(ROOT, 'server/migrations/eichholtz_com_raw.json')

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const ALGOLIA_INDEX  = 'live_magento2_en_products'
let   ALGOLIA_API_KEY = ''

// ─── Все подкатегории level2 для запросов ────────────────────────────────────
// Каждая < 1000, поэтому 1 запрос на 100 страниц × 10 = 1000 покрывает любую
const LEVEL2_QUERIES = [
  // Furniture subcategories (total 1323 — need split)
  'Collection /// Furniture /// Sofas | Ottomans',
  'Collection /// Furniture /// Chairs',
  'Collection /// Furniture /// Tables',
  'Collection /// Furniture /// Bedroom',
  'Collection /// Furniture /// Cabinets',
  'Collection /// Furniture /// Carpets',
  // Lighting subcategories (total 684 — fits in 1000)
  'Collection /// Lighting',
  // Accessories subcategories (total 759 — fits in 1000)
  'Collection /// Accessories',
  // Outdoor (total 213 — fits easily)
  'Collection /// Outdoor',
  // NEW collections — все актуальные коллекции с реального сайта
  'Collection /// New /// New Arrivals',
  'Collection /// New /// January 2026 Collection',
  'Collection /// New /// New Collection - September 2025',
  'Collection /// New /// The Met x Eichholtz',
  'Collection /// New /// Corey Damen Jenkins',
  'Collection /// New /// Maison Moghadam',
  'Collection /// New /// High Point Market | April 2024',
  'Collection /// New /// Timeless Revolution',
  'Collection /// New /// Natural Maximalism',
  'Collection /// New /// Bohemian Coastal',
  'Collection /// New /// Reflective Heritage',
]

// ─── Маппинг: Algolia category path → Русское название категории в нашей БД ──
// Использует ИМЕНА категорий (не ID!) → ID загружаются из БД динамически.
// Это исключает зависимость от конкретных ID и делает скрипт идемпотентным.
const ALGOLIA_TO_NAME_MAP = {
  // ── Мебель ────────────────────────────────────────────────────────────────
  'Collection /// Furniture':                                              'Мебель',
  'Collection /// Furniture /// Sofas | Ottomans':                         'Диваны | Пуфики',
  'Collection /// Furniture /// Sofas | Ottomans /// Sofas':               'Диваны',
  'Collection /// Furniture /// Sofas | Ottomans /// Ottomans':            'Османы',
  'Collection /// Furniture /// Sofas | Ottomans /// Benches':             'Скамейки',
  'Collection /// Furniture /// Sofas | Ottomans /// Modular sofas':       'Модульные диваны',
  'Collection /// Furniture /// Sofas | Ottomans /// Chaise longues':      'Кушетки',
  'Collection /// Furniture /// Chairs':                                   'Стулья',
  'Collection /// Furniture /// Chairs /// Armchairs':                     'Кресла',
  'Collection /// Furniture /// Chairs /// Dining chairs':                 'Обеденные стулья',
  'Collection /// Furniture /// Chairs /// Bar- & counterstols':           'Барные стулья',
  'Collection /// Furniture /// Chairs /// Stools':                        'Табуреты',
  'Collection /// Furniture /// Tables':                                   'Столы',
  'Collection /// Furniture /// Tables /// Coffee tables':                 'Кофейные столики',
  'Collection /// Furniture /// Tables /// Side tables':                   'Приставные столики',
  'Collection /// Furniture /// Tables /// Console tables':                'Консольные столы',
  'Collection /// Furniture /// Tables /// Dining tables':                 'Обеденные столы',
  'Collection /// Furniture /// Tables /// Trolleys':                      'Тележки',
  'Collection /// Furniture /// Tables /// Bars | Butler trays':           'Барные стойки | Подносы для дворецкого',
  'Collection /// Furniture /// Tables /// Columns':                       'Колонки',
  'Collection /// Furniture /// Tables /// Desks':                         'Столы',
  'Collection /// Furniture /// Bedroom':                                  'Спальня',
  'Collection /// Furniture /// Bedroom /// Headboards & beds':            'Изголовья и кровати',
  'Collection /// Furniture /// Bedroom /// Nightstands':                  'Прикроватные тумбочки',
  'Collection /// Furniture /// Bedroom /// Drawer dressers':              'Комоды с ящиками',
  'Collection /// Furniture /// Cabinets':                                 'Шкафы',
  'Collection /// Furniture /// Cabinets /// Display cabinets':            'Витрины',
  'Collection /// Furniture /// Cabinets /// Dressers':                    'Комоды',
  'Collection /// Furniture /// Cabinets /// Tv Cabinets':                 'Тумбы под телевизор',
  'Collection /// Furniture /// Cabinets /// Bar cabinets':                'Барные шкафы',
  'Collection /// Furniture /// Carpets':                                  'Ковры',
  // ── Освещение ─────────────────────────────────────────────────────────────
  'Collection /// Lighting':                                               'Освещение',
  'Collection /// Lighting /// Chandeliers':                               'Люстры',
  'Collection /// Lighting /// Ceiling lamps':                             'Потолочные светильники',
  'Collection /// Lighting /// Table lamps':                               'Настольные лампы',
  'Collection /// Lighting /// Floor lamps':                               'Торшеры',
  'Collection /// Lighting /// Wall lamps':                                'Бра',
  'Collection /// Lighting /// Outdoor lighting':                          'Наружное освещение',
  'Collection /// Lighting /// LED bulbs':                                 'LED лампы',
  'Collection /// Lighting /// Shades':                                    'Абажуры',
  'Collection /// Lighting /// Pendant lamps':                             'Потолочные светильники',
  // ── Аксессуары ────────────────────────────────────────────────────────────
  'Collection /// Accessories':                                            'Аксессуары',
  'Collection /// Accessories /// Mirrors':                                'Зеркала',
  'Collection /// Accessories /// Mirrors /// Wall mirrors':               'Настенные зеркала',
  'Collection /// Accessories /// Mirrors /// Table and floor mirrors':    'Настольные и напольные зеркала',
  'Collection /// Accessories /// Wall decorations':                       'Настенные украшения',
  'Collection /// Accessories /// Wall decorations /// Wall objects':      'Настенные объекты',
  'Collection /// Accessories /// Wall decorations /// Prints':            'Отпечатки',
  'Collection /// Accessories /// Decorative items':                       'Декоративные предметы',
  'Collection /// Accessories /// Decorative items /// Ashtrays':          'Пепельницы',
  'Collection /// Accessories /// Decorative items /// Bookends':          'Подставки для книг',
  'Collection /// Accessories /// Decorative items /// Bowls':             'Боулз',
  'Collection /// Accessories /// Decorative items /// Boxes':             'Коробки',
  'Collection /// Accessories /// Decorative items /// Decorative objects':'Декоративные объекты',
  'Collection /// Accessories /// Decorative items /// Picture frames':    'Рамки для картин',
  'Collection /// Accessories /// Decorative items /// Statues':           'Статуи',
  'Collection /// Accessories /// Hurricanes | Candle holders':            'Подсвечники | Подсвечники',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Candle holders': 'Подсвечники',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Hurricanes':     'Ураганы',
  'Collection /// Accessories /// Hurricanes | Candle holders /// Candles':        'Свечи',
  'Collection /// Accessories /// Artificial plants & flowers':            'Искусственные растения и цветы',
  'Collection /// Accessories /// Vases | Planters':                       'Вазы | Кашпо',
  'Collection /// Accessories /// Vases | Planters /// Vases':             'Вазы',
  'Collection /// Accessories /// Vases | Planters /// Planters':          'Кашпо',
  'Collection /// Accessories /// Serving accessories':                    'Сервировочные аксессуары',
  'Collection /// Accessories /// Serving accessories /// Serving accessories': 'Сервировочные аксессуары',
  'Collection /// Accessories /// Serving accessories /// Wine coolers':   'Охладители для вина',
  'Collection /// Accessories /// Serving accessories /// Wine racks':     'Подставки для вина',
  'Collection /// Accessories /// Home textiles':                          'Домашний текстиль',
  'Collection /// Accessories /// Home textiles /// Cushions':             'Подушки',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more':    'Вешалки для одежды | Подставки для зонтов и многое другое',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Coat racks':           'Вешалки для одежды',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Umbrella stands':      'Подставки для зонтов',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Fireplace accessories':'Каминные аксессуары',
  'Collection /// Accessories /// Coat racks | Umbrella stands & more /// Bathroom accessories': 'Аксессуары для ванной комнаты',
  // ── Для улицы ─────────────────────────────────────────────────────────────
  'Collection /// Outdoor':                                                'Для улицы',
  'Collection /// Outdoor /// Outdoor sofas | Daybeds':                    'Уличные диваны | Шезлонги',
  'Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor sofas':  'Уличные диваны',
  'Collection /// Outdoor /// Outdoor sofas | Daybeds /// Outdoor beds':   'Уличные кровати',
  'Collection /// Outdoor /// Outdoor chairs':                             'Уличные стулья',
  'Collection /// Outdoor /// Outdoor chairs /// Outdoor armchairs':       'Кресла для улицы',
  'Collection /// Outdoor /// Outdoor chairs /// Outdoor dining chairs':   'Обеденные стулья для улицы',
  'Collection /// Outdoor /// Outdoor tables':                             'Столики на открытом воздухе',
  'Collection /// Outdoor /// Outdoor tables /// Outdoor coffee tables':   'Кофейные столики на открытом воздухе',
  'Collection /// Outdoor /// Outdoor tables /// Outdoor dining tables':   'Столы для обеда на открытом воздухе',
  'Collection /// Outdoor /// Outdoor tables /// Outdoor side tables':     'Уличные столики',
  'Collection /// Outdoor /// Outdoor tables /// Outdoor console tables':  'Уличные консольные столики',
  'Collection /// Outdoor /// Outdoor rugs':                               'Уличные ковры',
  'Collection /// Outdoor /// Outdoor accessories':                        'Аксессуары для улицы',
  'Collection /// Outdoor /// Outdoor lighting':                           'Наружное освещение',
  'Collection /// Outdoor /// Outdoor covers':                             'Уличные чехлы',
  'Collection /// Outdoor /// Outdoor planters':                           'Уличные кашпо',
}

// Загружается из БД при старте — имя → id
let CAT_MAP = {}

// ─── Маппинг: NEW коллекции ───────────────────────────────────────────────────
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// Загружаем реальные ID категорий из БД по именам
async function buildCategoryMap() {
  const { rows } = await query(`SELECT id, name FROM categories`)
  const nameToId = {}
  for (const r of rows) nameToId[r.name] = r.id

  const map = {}
  for (const [algoliaPath, ruName] of Object.entries(ALGOLIA_TO_NAME_MAP)) {
    if (nameToId[ruName] !== undefined) {
      map[algoliaPath] = nameToId[ruName]
    } else {
      // Не нашли по точному имени — ищем по fallback
      // (некоторые имена в БД могут совпадать с другими категориями)
    }
  }

  // Подсчитаем сколько смапировали
  const mapped = Object.keys(map).length
  const total  = Object.keys(ALGOLIA_TO_NAME_MAP).length
  console.log(`  Category map: ${mapped}/${total} paths mapped to DB ids`)

  // Предупреждение о несмапированных
  const unmapped = Object.entries(ALGOLIA_TO_NAME_MAP)
    .filter(([p]) => !map[p])
    .map(([, n]) => n)
  if (unmapped.length > 0) {
    const unique = [...new Set(unmapped)]
    console.log(`  Not found in DB: ${unique.join(', ')}`)
  }

  return map
}

function resolveCategoryId(cats) {
  for (const lvl of ['level3', 'level2', 'level1', 'level0']) {
    for (const p of (cats[lvl] || [])) {
      if (CAT_MAP[p] !== undefined) return CAT_MAP[p]
    }
  }
  return null
}

function resolveNewCollectionName(cats) {
  for (const lvl of ['level2', 'level1']) {
    for (const p of (cats[lvl] || [])) {
      if (NEW_COLLECTION_MAP[p]) return NEW_COLLECTION_MAP[p]
    }
  }
  return null
}

// ─── Шаг 1: Получить API ключ ─────────────────────────────────────────────────
async function fetchAlgoliaApiKey() {
  console.log('  Fetching Algolia API key from eichholtz.com...')
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

// ─── Шаг 2: Запрос одной категории (все страницы до 1000 лимита) ──────────────
async function fetchCategoryProducts(categoryPath) {
  const ATTRS = [
    'name', 'sku', 'thumbnail_url', 'image_url',
    'categories', 'objectID', 'item_name',
    'color', 'product_groupcode_filter', 'website_material_filter',
  ]
  const HITS_PER_PAGE = 100 // маленький size = больше страниц доступно (max 10 стр × 100 = 1000)

  const doRequest = async (page) => {
    const res = await fetch(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hitsPerPage: HITS_PER_PAGE,
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

  // Первый запрос: узнать кол-во страниц
  const first = await doRequest(0)
  const nbPages = Math.min(first.nbPages || 1, 10) // cap at 10 (1000 total)
  const hits = [...first.hits]

  for (let page = 1; page < nbPages; page++) {
    await sleep(150)
    const data = await doRequest(page)
    hits.push(...data.hits)
  }

  return hits
}

// ─── Шаг 2b: Для level1 категорий без level2 sub-queries ─────────────────────
async function fetchLevel1Products(categoryPath) {
  const ATTRS = [
    'name', 'sku', 'thumbnail_url', 'image_url',
    'categories', 'objectID', 'item_name',
    'color', 'product_groupcode_filter', 'website_material_filter',
  ]
  const HITS_PER_PAGE = 100

  const doRequest = async (page, level) => {
    const filter = level === 1
      ? [[`categories.level1:${categoryPath}`]]
      : [[`categories.level2:${categoryPath}`]]

    const res = await fetch(
      `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
      {
        method: 'POST',
        headers: {
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hitsPerPage: HITS_PER_PAGE,
          page,
          facetFilters: filter,
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

  const first = await doRequest(0, 1)
  const nbPages = Math.min(first.nbPages || 1, 10)
  const hits = [...first.hits]

  for (let page = 1; page < nbPages; page++) {
    await sleep(150)
    const data = await doRequest(page, 1)
    hits.push(...data.hits)
  }

  return hits
}

// ─── Шаг 2c: Все товары — по всем подкатегориям ──────────────────────────────
async function fetchAllProductsFromAlgolia() {
  const allHits = []
  const seenIds = new Set()

  console.log(`  Fetching by subcategory (to bypass 1000-hit limit)...`)
  console.log(`  Total queries: ${LEVEL2_QUERIES.length}`)

  for (const catPath of LEVEL2_QUERIES) {
    let hits
    // Определяем: это level2 или level1 запрос
    const isLevel1 = ['Collection /// Lighting', 'Collection /// Accessories', 'Collection /// Outdoor'].includes(catPath)
    const isNewCol = catPath.startsWith('Collection /// New ///')

    try {
      if (isLevel1) {
        hits = await fetchLevel1Products(catPath)
      } else if (isNewCol) {
        // NEW коллекции — используем level2 filter
        hits = await fetchCategoryProducts(catPath)
      } else {
        // Furniture sub — используем level2 filter
        hits = await fetchCategoryProducts(catPath)
      }
    } catch (err) {
      console.warn(`\n  WARN [${catPath}]: ${err.message}`)
      hits = []
    }

    let added = 0
    for (const h of hits) {
      if (!seenIds.has(h.objectID)) {
        seenIds.add(h.objectID)
        allHits.push(h)
        added++
      }
    }
    console.log(`  [${hits.length}→+${added}] ${catPath.replace('Collection /// ', '')}`)
    await sleep(200)
  }

  return allHits
}

// ─── Шаг 3: Обработка ────────────────────────────────────────────────────────
function processProducts(hits) {
  const processed = []
  const skipped = {}

  for (const hit of hits) {
    const cats = hit.categories || {}
    const categoryId = resolveCategoryId(cats)
    const newCollectionName = resolveNewCollectionName(cats)

    if (!categoryId && !newCollectionName) {
      const allPaths = [...(cats.level1||[]), ...(cats.level2||[])]
      for (const p of allPaths) {
        if (!p.startsWith('Collection /// New') && !p.startsWith('Inspiration')) {
          skipped[p] = (skipped[p] || 0) + 1
        }
      }
      continue
    }

    const name = (hit.name || hit.item_name || '').trim()
    if (!name) continue

    const imageUrl = hit.thumbnail_url || hit.image_url || ''
    const specs = {}
    if (hit.color) specs.color = hit.color
    if (hit.website_material_filter) specs.material = hit.website_material_filter
    if (hit.product_groupcode_filter) specs.product_group = hit.product_groupcode_filter

    processed.push({
      objectID: hit.objectID,
      sku: hit.sku || '',
      name,
      image_url: imageUrl,
      images: imageUrl ? JSON.stringify([imageUrl]) : '[]',
      category_id: categoryId || null,
      newCollectionName: newCollectionName || null,
      specs: JSON.stringify(specs),
    })
  }

  if (Object.keys(skipped).length > 0) {
    console.log('\n  Skipped paths (no mapping):')
    Object.entries(skipped).sort((a,b)=>b[1]-a[1]).slice(0,15)
      .forEach(([k,v]) => console.log(`    [${v}] ${k}`))
  }

  return processed
}

// ─── Шаг 4: Очистка БД ────────────────────────────────────────────────────────
async function cleanDb() {
  await query('DELETE FROM cart_items')
  await query('DELETE FROM favorites')
  const { rowCount: dp } = await query('DELETE FROM products')
  console.log(`  Cleared products (${dp}), cart_items, favorites`)

  // Удаляем все NEW сезоны (любые дубли от прошлых запусков)
  const { rows: newSeasons } = await query(`SELECT id FROM seasons WHERE name = 'NEW'`)
  for (const { id } of newSeasons) {
    await query(`DELETE FROM collections WHERE season_id = $1`, [id])
    await query(`DELETE FROM seasons WHERE id = $1`, [id])
    console.log(`  Deleted NEW season id=${id}`)
  }

  // Удаляем пустые сезоны (Весна/Зима/Весь год без коллекций)
  await query(`
    DELETE FROM seasons
    WHERE name IN ('Весна / Лето 2026', 'Зима 2026', 'Весь год')
      AND id NOT IN (SELECT DISTINCT season_id FROM collections)
  `)
}

// ─── Шаг 5: Создать сезон NEW ────────────────────────────────────────────────
async function createNewSeason(uniqueColNames) {
  const { rows: [season] } = await query(
    `INSERT INTO seasons (name, description, published, sort_order, show_on_home)
     VALUES ('NEW', 'Новые поступления и коллекции Eichholtz', true, 1, true)
     RETURNING id`
  )
  const seasonId = season.id
  console.log(`  Season "NEW" id=${seasonId}`)

  const ORDER = [
    'New Arrivals',
    'New Collection - January 2026',
    'New Collection - September 2025',
    'The Met x Eichholtz',
    'Corey Damen Jenkins',
    'Maison Moghadam',
  ]
  const allNames = [...new Set([...ORDER, ...uniqueColNames])]
  const idByName = {}

  for (const [i, name] of allNames.entries()) {
    const { rows: [col] } = await query(
      `INSERT INTO collections (season_id, name, description, published, sort_order, kind, is_new)
       VALUES ($1, $2, '', true, $3, 'category', true) RETURNING id`,
      [seasonId, name, i + 1]
    )
    idByName[name] = col.id
    console.log(`  Collection: "${name}" id=${col.id}`)
  }

  return idByName
}

// ─── Шаг 6: Вставка товаров ──────────────────────────────────────────────────
async function insertProducts(products, collectionIdByName) {
  let ok = 0, skip = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const collectionId = p.newCollectionName ? (collectionIdByName[p.newCollectionName] || null) : null

    try {
      await query(
        `INSERT INTO products
           (name, description, price, image_url, images, specs, in_stock, published,
            category_id, collection_id, category)
         VALUES ($1, '', 0, $2, $3::jsonb, $4::jsonb, true, true, $5, $6, '')`,
        [p.name, p.image_url, p.images, p.specs, p.category_id, collectionId]
      )
      ok++
    } catch (err) {
      skip++
      if (skip <= 5) console.warn(`\n  WARN insert "${p.name}": ${err.message}`)
    }

    if (i % 100 === 0 || i === products.length - 1) {
      process.stdout.write(`\r  ${i+1}/${products.length} ok:${ok} skip:${skip}`)
    }
  }

  console.log()
  return ok
}

// ─── Статистика ───────────────────────────────────────────────────────────────
async function printStats() {
  const { rows: catStats } = await query(`
    SELECT c.name, COUNT(p.id) as n
    FROM categories c LEFT JOIN products p ON p.category_id = c.id
    WHERE c.parent_id IS NULL GROUP BY c.id, c.name ORDER BY COUNT(p.id) DESC
  `)
  console.log('\nTop-level categories:')
  for (const r of catStats) console.log(`  ${r.name}: ${r.n}`)

  const { rows: sub } = await query(`
    SELECT c.name, pc.name as parent, COUNT(pr.id) as n
    FROM categories c
    JOIN categories pc ON pc.id = c.parent_id
    LEFT JOIN products pr ON pr.category_id = c.id
    WHERE c.parent_id IS NOT NULL AND pc.parent_id IS NULL
    GROUP BY c.id, c.name, pc.name HAVING COUNT(pr.id) > 0
    ORDER BY pc.name, COUNT(pr.id) DESC
  `)
  console.log('\nSubcategories:')
  let curParent = ''
  for (const r of sub) {
    if (r.parent !== curParent) { console.log(`  [${r.parent}]`); curParent = r.parent }
    console.log(`    ${r.name}: ${r.n}`)
  }

  const { rows: colStats } = await query(`
    SELECT c.name, COUNT(p.id) as n
    FROM collections c LEFT JOIN products p ON p.collection_id = c.id
    WHERE c.season_id = (SELECT id FROM seasons WHERE name = 'NEW' LIMIT 1)
    GROUP BY c.id, c.name ORDER BY c.sort_order
  `)
  console.log('\nNEW collections:')
  for (const r of colStats) console.log(`  ${r.name}: ${r.n}`)

  const { rows: [total] } = await query('SELECT COUNT(*) as n FROM products')
  console.log(`\nTotal in DB: ${total.n}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const FORCE = process.argv.includes('--force')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Eichholtz.com Product Scraper v3 (per-subcategory)')
  console.log(`  Mode: ${FORCE ? 'FORCE (re-scrape)' : 'use cache if exists'}`)
  console.log('═══════════════════════════════════════════════════════════\n')

  validateEnv()
  await initDb()

  // 0. Загружаем маппинг категорий из реальной БД
  console.log('[0/6] Building category map from DB...')
  CAT_MAP = await buildCategoryMap()

  // 1. API key
  console.log('[1/6] Algolia API key...')
  ALGOLIA_API_KEY = await fetchAlgoliaApiKey()
  console.log(`  Key: ${ALGOLIA_API_KEY.substring(0, 16)}... (len=${ALGOLIA_API_KEY.length})`)

  // 2. Fetch
  let rawHits
  const cacheExists = await fs.access(RAW_JSON).then(() => true).catch(() => false)

  if (cacheExists && !FORCE) {
    console.log('[2/6] Loading from cache...')
    rawHits = JSON.parse(await fs.readFile(RAW_JSON, 'utf-8'))
    console.log(`  Loaded ${rawHits.length} from cache`)
  } else {
    console.log('[2/6] Fetching from Algolia by subcategory...')
    rawHits = await fetchAllProductsFromAlgolia()
    console.log(`\n  Total unique hits: ${rawHits.length}`)
    await fs.mkdir(path.dirname(RAW_JSON), { recursive: true })
    await fs.writeFile(RAW_JSON, JSON.stringify(rawHits, null, 2))
    console.log(`  Saved to ${RAW_JSON}`)
  }

  // 3. Process
  console.log('\n[3/6] Processing...')
  const processed = processProducts(rawHits)
  const withCat = processed.filter(p => p.category_id).length
  const withNew = processed.filter(p => p.newCollectionName).length
  console.log(`  Valid: ${processed.length} / ${rawHits.length}`)
  console.log(`  With category: ${withCat}, in NEW collection: ${withNew}`)
  const byCol = {}
  processed.filter(p => p.newCollectionName).forEach(p => { byCol[p.newCollectionName] = (byCol[p.newCollectionName]||0)+1 })
  if (Object.keys(byCol).length) console.log('  NEW:', JSON.stringify(byCol))

  // 4. Clean
  console.log('\n[4/6] Cleaning DB...')
  await cleanDb()

  // 5. Create NEW season
  console.log('\n[5/6] Creating NEW season...')
  const uniqueColNames = [...new Set(processed.filter(p => p.newCollectionName).map(p => p.newCollectionName))]
  const collectionIdByName = await createNewSeason(uniqueColNames)

  // 6. Insert
  console.log(`\n[6/6] Inserting ${processed.length} products...`)
  const inserted = await insertProducts(processed, collectionIdByName)

  // Stats
  console.log('\n📊 Statistics:')
  await printStats()

  console.log('\n✅ Done!')
  console.log(`   Total inserted: ${inserted}`)
}

main()
  .catch(err => { console.error('\n❌', err.message, '\n', err.stack); process.exit(1) })
  .finally(() => closePool())

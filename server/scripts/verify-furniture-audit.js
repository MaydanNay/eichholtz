#!/usr/bin/env node
/**
 * verify-furniture-audit.js
 * Максимально тщательный аудит парсинга и сохранения категории Мебель в БД.
 */

import 'dotenv/config'
import { query, initDb, closePool, validateEnv } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
let ALGOLIA_API_KEY = ''

const CATEGORIES_TO_CHECK = [
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Modular sofas',       dbName: 'Модульные диваны' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Ottomans',            dbName: 'Османы' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Benches',             dbName: 'Скамейки' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Chaise longues',      dbName: 'Шезлонги' },
  { path: 'Collection /// Furniture /// Chairs /// Armchairs',                     dbName: 'Кресла' },
  { path: 'Collection /// Furniture /// Chairs /// Dining chairs',                 dbName: 'Обеденные стулья' },
  { path: 'Collection /// Furniture /// Chairs /// Bar- & counterstools',           dbName: 'Барные и кухонные стулья' },
  { path: 'Collection /// Furniture /// Chairs /// Stools',                        dbName: 'Стулья' },
  { path: 'Collection /// Furniture /// Tables /// Coffee tables',                 dbName: 'Кофейные столики' },
  { path: 'Collection /// Furniture /// Tables /// Side tables',                   dbName: 'Приставные столики' },
  { path: 'Collection /// Furniture /// Tables /// Console tables',                dbName: 'Консольные столы' },
  { path: 'Collection /// Furniture /// Tables /// Dining tables',                 dbName: 'Обеденные столы' },
  { path: 'Collection /// Furniture /// Tables /// Desks',                         dbName: 'Столы' },
  { path: 'Collection /// Furniture /// Tables /// Trolleys',                      dbName: 'Тележки' },
  { path: 'Collection /// Furniture /// Tables /// Columns',                       dbName: 'Колонки' },
  { path: 'Collection /// Furniture /// Tables /// Bars | Butler trays',           dbName: 'Барные стойки | Подносы для дворецкого' },
  { path: 'Collection /// Furniture /// Bedroom /// Headboards & beds',            dbName: 'Изголовья и кровати' },
  { path: 'Collection /// Furniture /// Bedroom /// Nightstands',                  dbName: 'Прикроватные тумбочки' },
  { path: 'Collection /// Furniture /// Bedroom /// Drawer dressers',              dbName: 'Комоды с ящиками' },
  { path: 'Collection /// Furniture /// Cabinets /// Display cabinets',            dbName: 'Витрины' },
  { path: 'Collection /// Furniture /// Cabinets /// Dressers',                    dbName: 'Комоды' },
  { path: 'Collection /// Furniture /// Cabinets /// Bar cabinets',                dbName: 'Барные шкафы' },
  { path: 'Collection /// Furniture /// Cabinets /// Tv Cabinets',                 dbName: 'Тумбы под телевизор' },
  { path: 'Collection /// Furniture /// Rugs | Carpets',                           dbName: 'Ковры | Ковровые покрытия' },
  { path: 'Collection /// Furniture /// Sofas | Ottomans /// Sofas',               dbName: 'Диваны' },
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
  console.log('  ПОЛНЫЙ ГЛУБОКИЙ АУДИТ МЕБЕЛИ (Eichholtz site vs Postgres DB)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  validateEnv()
  await initDb()

  ALGOLIA_API_KEY = await fetchAlgoliaApiKey()

  // 1. Собираем все 1263 уникальных товара Мебели с Algolia API
  const algoliaMap = new Map() // objectID -> { hit, expectedDbCat }
  for (const item of CATEGORIES_TO_CHECK) {
    const isLevel2 = item.path === 'Collection /// Furniture /// Rugs | Carpets'
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
        facetFilters: [[`${filterKey}:${item.path}`]],
        filters: 'catalog_permissions.customer_group_1 != 0',
        attributesToRetrieve: ['name', 'sku', 'thumbnail_url', 'image_url', 'objectID', 'color', 'website_material_filter'],
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
          facetFilters: [[`${filterKey}:${item.path}`]],
          filters: 'catalog_permissions.customer_group_1 != 0',
          attributesToRetrieve: ['name', 'sku', 'thumbnail_url', 'image_url', 'objectID', 'color', 'website_material_filter'],
        })
      })
      const dP = await resP.json()
      hits.push(...(dP.hits || []))
    }

    for (const h of hits) {
      if (!algoliaMap.has(h.objectID)) {
        algoliaMap.set(h.objectID, { hit: h, expectedDbCat: item.dbName })
      }
    }
  }

  console.log(`1. Всего уникальных товаров Мебели на сайте eichholtz.com: ${algoliaMap.size}`)

  // 2. Проверяем каждый товар 1 в 1 в БД
  let foundInDb = 0
  let missingInDb = 0
  let withCategory = 0
  let withImages = 0
  let withSpecs = 0

  const missingList = []

  for (const { hit: h, expectedDbCat } of algoliaMap.values()) {
    const name = (h.name || h.item_name || '').trim()
    const sku = h.sku || ''

    // Ищем в БД
    const { rows } = await query(
      `SELECT p.id, p.name, p.category_id, p.image_url, p.images, p.specs, c.name as cat_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
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
      missingList.push({ name, sku, objectID: h.objectID, expectedDbCat })
    }
  }

  console.log(`2. Найдено совпадений в нашей БД: ${foundInDb} / ${algoliaMap.size} (${(foundInDb / algoliaMap.size * 100).toFixed(1)}%)`)
  console.log(`   - Из них имеют привязанную категорию: ${withCategory}`)
  console.log(`   - Из них имеют валидное фото/картинку: ${withImages}`)
  console.log(`   - Из них имеют сохраненные характеристики (SKU/Цвет/Материал): ${withSpecs}`)
  console.log(`   - Пропущено/отсутствует в БД: ${missingInDb}`)

  if (missingList.length > 0) {
    console.log('\n❌ Пропущенные товары:')
    for (const m of missingList.slice(0, 10)) {
      console.log(`   - [${m.sku}] ${m.name} (${m.expectedDbCat})`)
    }
  } else {
    console.log('\n✅ ВСЕ ДО ЕДИНОГО ТОВАРА НАЙДЕНЫ И СОХРАНЕНЫ В БД!')
  }

  // 3. Проверка каскадной структуры категории Мебель в БД
  const { rows: dbTree } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE name = 'Мебель'
      UNION ALL
      SELECT c.id FROM categories c JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT COUNT(DISTINCT id) as total_in_furniture FROM products WHERE category_id IN (SELECT id FROM cat_tree)
  `)

  console.log(`\n3. Общее количество товаров в ветке Мебель в нашей БД: ${dbTree[0].total_in_furniture}`)
  console.log('═══════════════════════════════════════════════════════════════\n')
}

main()
  .catch(err => { console.error('\n❌ Error during audit:', err.message, err.stack); process.exit(1) })
  .finally(() => closePool())

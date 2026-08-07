#!/usr/bin/env node
/**
 * scrape-products.js
 * Парсит все товары с eichholtz.kz и создаёт SQL файл миграции.
 *
 * Запуск:
 *   node server/scripts/scrape-products.js
 *   node server/scripts/scrape-products.js --max 100   # ограничить кол-во
 *   node server/scripts/scrape-products.js --concurrency 10
 *   node server/scripts/scrape-products.js --out ./server/migrations/seed_products.sql
 *
 * Результат:
 *   server/migrations/seed_products.sql  — SQL миграция для PostgreSQL
 *   server/migrations/products_raw.json  — сырые данные для повторного запуска
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')

// ─── Маппинг URL-slug → наша категория ──────────────────────────────────────
// Правая колонка — точное название категории в нашей БД (см. categories)
const SLUG_TO_CATEGORY = {
  tables:              'Столы',
  chairs:              'Кресла',
  sofas:               'Диваны',
  living:              'Гостиная',
  bedroom:             'Спальня',
  furniture:           'Мебель',
  lights:              'Освещение',
  ceiling:             'Потолочное',
  'table-lights':      'Настольное',
  wall:                'Настенное',
  accessories:         'Аксессуары',
  candles:             'Свечи и подсвечники',
  'wall-decor':        'Оформление стен',
  outdoor:             'Для улицы',
  sitting:             'Сидения',
  'tables-outdoor':    'Столы уличные',
  'accessories-outdoor': 'Аксессуары для улицы',
  // Коллекции — без привязки к категориям (они идут как 'no-category')
  new2:                null,
  'the-met':           null,
  'collection-january': null,
  'corey-damen':       null,
  'maison-moghadam':   null,
  news:                null,
  sale:                null,
  tproduct:            null,
}

// ─── Параметры ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const MAX_PRODUCTS = parseInt(getArg('--max', '99999'))
const CONCURRENCY  = parseInt(getArg('--concurrency', '6'))
const SQL_OUT      = getArg('--out', path.join(ROOT, 'server/migrations/seed_products.sql'))
const JSON_OUT     = path.join(path.dirname(SQL_OUT), 'products_raw.json')
const SITEMAP_PARTS = 4

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function sqlStr(s) {
  return s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`
}

// ─── Шаг 1: Собираем все URL из sitemap ──────────────────────────────────────
async function loadSitemapUrls() {
  const urls = []
  for (let i = 1; i <= SITEMAP_PARTS; i++) {
    const res = await fetch(`https://eichholtz.kz/sitemap-store-part${i}.xml`)
    if (!res.ok) break
    const xml = await res.text()
    const matches = [...xml.matchAll(/<loc>(https:\/\/eichholtz\.kz\/[^<]+\/tproduct\/[^<]+)<\/loc>/g)]
    for (const m of matches) {
      urls.push(m[1].trim())
    }
    console.log(`  Sitemap part ${i}: ${matches.length} URLs (total: ${urls.length})`)
  }
  return urls
}

// ─── Шаг 2: Парсим одну страницу продукта ────────────────────────────────────
async function parseProductPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()

    // Ищем JSON продукта внутри тега script
    const m = html.match(/var product = (\{"uid":[^;]+?"json_chars"[^;]+?\})\s*;/)
    if (!m) return null

    let data
    try { data = JSON.parse(m[1]) } catch { return null }

    // Определяем категорию из URL
    const urlPath = url.replace('https://eichholtz.kz/', '')
    const catSlug = urlPath.split('/tproduct/')[0] || ''
    const categoryName = SLUG_TO_CATEGORY[catSlug] ?? null

    // Парсим характеристики
    let specs = {}
    try {
      const chars = JSON.parse(data.json_chars || '[]')
      for (const c of chars) {
        if (c.title && c.value) {
          specs[c.title] = c.value
        }
      }
    } catch {}

    // Изображения
    const images = (data.gallery || [])
      .map(g => g.img || g.image || '')
      .filter(Boolean)

    return {
      uid: data.uid,
      name: data.title || '',
      description: stripHtml(data.descr || ''),
      sku: data.sku || '',
      price: parseFloat(data.price || 0) || 0,
      image_url: images[0] || '',
      images,
      specs,
      category_slug: catSlug,
      category_name: categoryName,
      url,
    }
  } catch {
    return null
  }
}

// ─── Шаг 3: Параллельный парсинг ─────────────────────────────────────────────
async function scrapeAll(urls) {
  const results = []
  const total = Math.min(urls.length, MAX_PRODUCTS)
  let done = 0
  let failed = 0

  const queue = [...urls.slice(0, total)]

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()
      if (!url) break
      const product = await parseProductPage(url)
      done++
      if (product) {
        results.push(product)
      } else {
        failed++
      }
      if (done % 50 === 0 || done === total) {
        process.stdout.write(`\r  Progress: ${done}/${total} (ok: ${results.length}, fail: ${failed})`)
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker())
  await Promise.all(workers)
  console.log()
  return results
}

// ─── Шаг 4: Генерируем SQL ───────────────────────────────────────────────────
function generateSQL(products) {
  const lines = []
  lines.push(`-- ===============================================================`)
  lines.push(`-- Migration: Products from eichholtz.kz`)
  lines.push(`-- Generated: ${new Date().toISOString()}`)
  lines.push(`-- Total products: ${products.length}`)
  lines.push(`-- DB: PostgreSQL (pg), user: eicholtz, db: eicholtz`)
  lines.push(`--`)
  lines.push(`-- Как запустить:`)
  lines.push(`--   psql postgresql://eicholtz:PASSWORD@HOST:5432/eicholtz \\`)
  lines.push(`--     -f seed_products.sql`)
  lines.push(`-- ===============================================================`)
  lines.push(``)
  lines.push(`BEGIN;`)
  lines.push(``)
  lines.push(`-- Очищаем существующие продукты (осторожно на production!)`)
  lines.push(`-- Закомментируй если не хочешь очищать существующие продукты`)
  lines.push(`-- TRUNCATE TABLE cart_items, favorites, products RESTART IDENTITY CASCADE;`)
  lines.push(``)
  lines.push(`-- Создаём временную таблицу для маппинга category_name → id`)
  lines.push(`CREATE TEMP TABLE IF NOT EXISTS _cat_map AS`)
  lines.push(`  SELECT c.id, c.name, p.name AS parent_name`)
  lines.push(`  FROM categories c`)
  lines.push(`  LEFT JOIN categories p ON p.id = c.parent_id;`)
  lines.push(``)

  for (const p of products) {
    const name = sqlStr(p.name)
    const descr = sqlStr(p.description.substring(0, 2000))
    const imgUrl = sqlStr(p.image_url)
    const images = sqlStr(JSON.stringify(p.images))
    const specs = sqlStr(JSON.stringify(p.specs))
    const sku = sqlStr(p.sku)
    const price = p.price || 0

    if (p.category_name) {
      // Продукт привязан к категории
      lines.push(`-- ${p.name} [${p.category_slug}]`)
      lines.push(`INSERT INTO products (name, description, price, image_url, images, specs, in_stock, published, category, category_id)`)
      lines.push(`SELECT ${name}, ${descr}, ${price}, ${imgUrl}, ${images}::jsonb, ${specs}::jsonb, true, true, ${sqlStr(p.category_name)},`)
      lines.push(`  (SELECT id FROM _cat_map WHERE name = ${sqlStr(p.category_name)} LIMIT 1)`)
      lines.push(`WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${name} AND COALESCE(category,'') = ${sqlStr(p.category_name)} LIMIT 1);`)
    } else {
      // Продукт без категории (новинки, коллекции и т.д.)
      lines.push(`-- ${p.name} [${p.category_slug || 'no-category'}]`)
      lines.push(`INSERT INTO products (name, description, price, image_url, images, specs, in_stock, published, category)`)
      lines.push(`SELECT ${name}, ${descr}, ${price}, ${imgUrl}, ${images}::jsonb, ${specs}::jsonb, true, true, ${sqlStr(p.category_slug || '')}`)
      lines.push(`WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${name} LIMIT 1);`)
    }
    lines.push(``)
  }

  lines.push(`DROP TABLE IF EXISTS _cat_map;`)
  lines.push(``)
  lines.push(`COMMIT;`)
  lines.push(``)
  lines.push(`-- Итог:`)
  lines.push(`-- SELECT COUNT(*) FROM products;`)
  lines.push(`-- SELECT c.name, COUNT(p.id) FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.name ORDER BY COUNT(p.id) DESC;`)

  return lines.join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Eichholtz Product Scraper ===')
  console.log(`Concurrency: ${CONCURRENCY} | Max: ${MAX_PRODUCTS}`)
  console.log()

  console.log('Step 1: Loading sitemap URLs...')
  const urls = await loadSitemapUrls()
  console.log(`  Found ${urls.length} product URLs\n`)

  // Проверяем был ли уже создан JSON файл (для повторного запуска)
  let products
  try {
    const existing = JSON.parse(await fs.readFile(JSON_OUT, 'utf-8'))
    console.log(`Step 2: Found existing ${JSON_OUT} with ${existing.length} products`)
    console.log('  Using cached data. Delete products_raw.json to re-scrape.\n')
    products = existing
  } catch {
    console.log('Step 2: Scraping product pages...')
    products = await scrapeAll(urls)
    console.log(`  Done! Got ${products.length} products\n`)

    console.log(`Step 3: Saving raw data to ${JSON_OUT}...`)
    await fs.mkdir(path.dirname(JSON_OUT), { recursive: true })
    await fs.writeFile(JSON_OUT, JSON.stringify(products, null, 2))
  }

  console.log(`Step 4: Generating SQL migration...`)
  const sql = generateSQL(products)
  await fs.writeFile(SQL_OUT, sql)
  console.log(`  Saved to ${SQL_OUT}`)
  console.log()

  // Статистика
  const byCat = {}
  for (const p of products) {
    const k = p.category_name || `[${p.category_slug || 'none'}]`
    byCat[k] = (byCat[k] || 0) + 1
  }
  console.log('Products by category:')
  for (const [cat, cnt] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${cnt}`)
  }
  console.log(`\nTotal: ${products.length} products`)
  console.log(`\nSQL migration: ${SQL_OUT}`)
}

main().catch(err => { console.error(err); process.exit(1) })

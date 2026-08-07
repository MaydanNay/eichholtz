#!/usr/bin/env node
/**
 * Диагностика: проверяет корректность данных в БД после scrape-eichholtz-com.js
 * Запуск:
 *   docker run --rm --network eicholtz_default -v $(pwd):/app -w /app \
 *     -e DATABASE_URL=postgresql://eicholtz:eicholtz@db:5432/eicholtz \
 *     -e ADMIN_EMAIL=x -e ADMIN_PASSWORD=x -e JWT_SECRET=xxxxxxxxxxxxxxxx \
 *     node:20-alpine node server/scripts/verify-scrape.js
 */
import 'dotenv/config'
import { query, initDb, closePool, validateEnv } from '../db.js'

async function main() {
  validateEnv()
  await initDb()

  let errors = 0
  let warnings = 0

  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║          ДИАГНОСТИКА ПОСЛЕ ПАРСИНГА eichholtz.com           ║')
  console.log('╚══════════════════════════════════════════════════════════════╝\n')

  // ── 1. Категории ──────────────────────────────────────────────────────────
  console.log('1. КАТЕГОРИИ В БД:')
  const { rows: cats } = await query(`
    SELECT c.id, c.name, pc.name as parent, c.published
    FROM categories c
    LEFT JOIN categories pc ON pc.id = c.parent_id
    ORDER BY COALESCE(c.parent_id, c.id), c.sort_order
  `)
  for (const c of cats) {
    const p = c.parent ? `  [${c.parent}]` : ''
    const pub = c.published ? '✓' : '✗'
    console.log(`  ${pub} id=${String(c.id).padStart(4)}: ${c.name}${p}`)
  }
  console.log(`  Total: ${cats.length} categories\n`)

  // ── 2. Статистика товаров по категориям ────────────────────────────────────
  console.log('2. ТОВАРЫ ПО КАТЕГОРИЯМ:')
  const { rows: catStats } = await query(`
    SELECT c.id, c.name, pc.name as parent_name, COUNT(p.id)::int as n
    FROM categories c
    LEFT JOIN categories pc ON pc.id = c.parent_id
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id, c.name, pc.name
    ORDER BY COALESCE(pc.name, c.name), c.name
  `)
  let totalWithCat = 0
  for (const r of catStats) {
    if (r.n > 0) {
      const p = r.parent_name ? ` → [${r.parent_name}]` : ''
      console.log(`  id=${String(r.id).padStart(4)}${p}: ${r.name} = ${r.n}`)
      totalWithCat += r.n
    }
  }

  // ── 3. Товары с NULL category_id ──────────────────────────────────────────
  const { rows: [nullCat] } = await query(`
    SELECT COUNT(*)::int as n FROM products WHERE category_id IS NULL
  `)
  console.log(`\n  Products WITH category_id: ${totalWithCat}`)
  console.log(`  Products WITHOUT category_id (NULL): ${nullCat.n}`)
  if (nullCat.n > 0) {
    console.log('  ⚠ NULL category products (first 10):')
    const { rows: nullProds } = await query(`
      SELECT id, name, collection_id FROM products WHERE category_id IS NULL LIMIT 10
    `)
    for (const p of nullProds) {
      console.log(`    [${p.id}] ${p.name} (collection_id=${p.collection_id})`)
    }
  }

  // ── 4. Несуществующие category_id ─────────────────────────────────────────
  const { rows: orphaned } = await query(`
    SELECT p.category_id, COUNT(*)::int as n
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.category_id IS NOT NULL AND c.id IS NULL
    GROUP BY p.category_id
  `)
  if (orphaned.length > 0) {
    console.log('\n  ❌ ORPHANED category_id (not in categories table):')
    for (const r of orphaned) {
      console.log(`    category_id=${r.category_id}: ${r.n} products`)
      errors++
    }
  } else {
    console.log('\n  ✅ All category_id references are valid')
  }

  // ── 5. Сезон NEW и коллекции ───────────────────────────────────────────────
  console.log('\n3. СЕЗОН NEW И КОЛЛЕКЦИИ:')
  const { rows: seasons } = await query(`
    SELECT s.id, s.name, s.published, COUNT(c.id)::int as col_count
    FROM seasons s
    LEFT JOIN collections c ON c.season_id = s.id
    GROUP BY s.id, s.name, s.published
    ORDER BY s.sort_order
  `)
  for (const s of seasons) {
    const pub = s.published ? '✓' : '✗'
    console.log(`  ${pub} Season id=${s.id}: "${s.name}" (${s.col_count} collections)`)
    if (s.name === 'NEW') {
      const { rows: colls } = await query(`
        SELECT c.id, c.name, c.is_new, COUNT(p.id)::int as n
        FROM collections c
        LEFT JOIN products p ON p.collection_id = c.id
        WHERE c.season_id = $1
        GROUP BY c.id, c.name, c.is_new
        ORDER BY c.sort_order
      `, [s.id])
      for (const col of colls) {
        const isnew = col.is_new ? ' [NEW]' : ''
        console.log(`    Collection id=${col.id}: "${col.name}"${isnew} → ${col.n} products`)
        if (col.n === 0 && !['New Arrivals', 'Maison Moghadam'].includes(col.name)) {
          console.log(`    ⚠ Warning: "${col.name}" has 0 products`)
          warnings++
        }
      }
    }
  }

  // ── 6. Общая статистика ────────────────────────────────────────────────────
  console.log('\n4. ОБЩАЯ СТАТИСТИКА:')
  const { rows: [total] } = await query('SELECT COUNT(*)::int as n FROM products')
  const { rows: [published] } = await query('SELECT COUNT(*)::int as n FROM products WHERE published = true')
  const { rows: [withImg] } = await query(`SELECT COUNT(*)::int as n FROM products WHERE image_url <> ''`)
  const { rows: [withCollection] } = await query(`SELECT COUNT(*)::int as n FROM products WHERE collection_id IS NOT NULL`)

  console.log(`  Total products: ${total.n}`)
  console.log(`  Published: ${published.n}`)
  console.log(`  With image: ${withImg.n}`)
  console.log(`  With NEW collection: ${withCollection.n}`)

  if (withImg.n < total.n * 0.5) {
    console.log('  ⚠ Warning: Less than 50% of products have images')
    warnings++
  }

  // ── 7. Дубли по name ──────────────────────────────────────────────────────
  console.log('\n5. ДУБЛИ:')
  const { rows: dupes } = await query(`
    SELECT name, COUNT(*)::int as n FROM products
    GROUP BY name HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC LIMIT 10
  `)
  if (dupes.length > 0) {
    console.log('  ⚠ Duplicate product names (first 10):')
    for (const d of dupes) console.log(`    [${d.n}x] ${d.name}`)
    warnings++
  } else {
    console.log('  ✅ No duplicate product names')
  }

  // ── 8. Образцы данных ─────────────────────────────────────────────────────
  console.log('\n6. ОБРАЗЦЫ (по 2 из каждой главной категории):')
  const mainCats = ['Мебель', 'Освещение', 'Аксессуары', 'Для улицы']
  for (const catName of mainCats) {
    const { rows: samples } = await query(`
      SELECT p.name, p.image_url, c.name as cat, pc.name as parent
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE (pc.name = $1 OR (c.name = $1 AND pc.id IS NULL))
      ORDER BY RANDOM() LIMIT 2
    `, [catName])
    if (samples.length > 0) {
      console.log(`  [${catName}]:`)
      for (const s of samples) {
        const img = s.image_url ? '🖼' : '❌'
        console.log(`    ${img} ${s.name} → ${s.cat}`)
      }
    } else {
      console.log(`  [${catName}]: NO PRODUCTS FOUND ❌`)
      errors++
    }
  }

  // ── ИТОГО ─────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════')
  if (errors === 0 && warnings === 0) {
    console.log('✅ ALL CHECKS PASSED — данные в порядке!')
  } else {
    if (errors > 0) console.log(`❌ ERRORS: ${errors}`)
    if (warnings > 0) console.log(`⚠ WARNINGS: ${warnings}`)
  }
  console.log('══════════════════════════════════════════════════════════════\n')
}

main()
  .catch(err => { console.error('\n❌ Fatal:', err.message, '\n', err.stack); process.exit(1) })
  .finally(() => closePool())

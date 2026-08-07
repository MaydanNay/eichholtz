#!/usr/bin/env node
/**
 * generate-migration.js
 * Генерирует финальный SQL файл миграции для деплоя на сервер.
 * Читает products_raw.json и создаёт полный seed_all.sql.
 *
 * Запуск:
 *   node server/scripts/generate-migration.js
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const JSON_IN = path.join(ROOT, 'server/migrations/products_raw.json')
const SQL_OUT = path.join(ROOT, 'server/migrations/seed_all.sql')

// ─── Маппинг URL-slug → наша категория (включая коллекции) ──────────────────
// Для коллекций (new2, the-met и т.д.) ставим наиболее подходящую категорию
// на основе анализа данных (большинство товаров там — мебель/аксессуары/свет)
const SLUG_TO_CATEGORY = {
  // Основные категории
  living:               'Гостиная',
  bedroom:              'Спальня',
  chairs:               'Кресла',
  sofas:                'Диваны',
  sitting:              'Диваны',
  tables:               'Столы',
  lights:               'Потолочное освещение',
  'table-lights':       'Настольное освещение',
  wall:                 'Настенное освещение',
  candles:              'Свечи и подсвечники',
  'wall-decor':         'Декор стен',
  accessories:          'Аксессуары',
  outdoor:              'Диваны для улицы | Кушетки',
  'accessories-outdoor':'Outdoor аксессуары',
  sale:                 'Распродажа',
  furniture:            'Мебель',
  
  // Специальные коллекции — без принудительной привязки к категории
  // (будут вставлены с category=slug, category_id=NULL)
  new2:                 null,
  'the-met':            null,
  'collection-january': null,
  'corey-damen':        null,
  'maison-moghadam':    null,
  news:                 null,
}

function sqlStr(s) {
  if (s == null) return 'NULL'
  return `'${String(s).replace(/'/g, "''").substring(0, 3000)}'`
}

function generateSQL(products) {
  const lines = []

  lines.push(`-- =================================================================`)
  lines.push(`-- seed_all.sql — ПОЛНАЯ МИГРАЦИЯ для деплоя на сервер`)
  lines.push(`-- Сгенерировано: ${new Date().toISOString()}`)
  lines.push(`-- Продуктов: ${products.length}`)
  lines.push(`-- DB: PostgreSQL, user: eicholtz, db: eicholtz`)
  lines.push(`--`)
  lines.push(`-- КАК ЗАПУСТИТЬ:`)
  lines.push(`--   psql postgresql://eicholtz:PASSWORD@HOST:5432/eicholtz -f seed_all.sql`)
  lines.push(`--`)
  lines.push(`-- Или через Docker:`)
  lines.push(`--   docker cp seed_all.sql <db_container>:/tmp/`)
  lines.push(`--   docker exec <db_container> psql -U eicholtz -d eicholtz -f /tmp/seed_all.sql`)
  lines.push(`-- =================================================================`)
  lines.push(``)
  lines.push(`BEGIN;`)
  lines.push(``)

  // ─── ЧАСТЬ 1: Категории ──────────────────────────────────────────────────
  lines.push(`-- =================================================================`)
  lines.push(`-- ЧАСТЬ 1: Категории`)
  lines.push(`-- =================================================================`)
  lines.push(``)
  lines.push(`-- Очищаем старые категории (опционально, но лучше для чистого импорта)`)
  lines.push(`DELETE FROM categories;`)
  lines.push(``)
  lines.push(`CREATE OR REPLACE FUNCTION _upsert_cat(`)
  lines.push(`  p_name TEXT, p_description TEXT, p_image_url TEXT,`)
  lines.push(`  p_sort_order INTEGER, p_parent_name TEXT DEFAULT NULL`)
  lines.push(`) RETURNS INTEGER AS $$`)
  lines.push(`DECLARE`)
  lines.push(`  v_parent_id INTEGER := NULL;`)
  lines.push(`  v_existing_id INTEGER;`)
  lines.push(`  v_new_id INTEGER;`)
  lines.push(`BEGIN`)
  lines.push(`  IF p_parent_name IS NOT NULL THEN`)
  lines.push(`    SELECT id INTO v_parent_id FROM categories`)
  lines.push(`    WHERE name = p_parent_name AND parent_id IS NULL LIMIT 1;`)
  lines.push(`  END IF;`)
  lines.push(`  IF v_parent_id IS NULL THEN`)
  lines.push(`    SELECT id INTO v_existing_id FROM categories WHERE name = p_name AND parent_id IS NULL LIMIT 1;`)
  lines.push(`  ELSE`)
  lines.push(`    SELECT id INTO v_existing_id FROM categories WHERE name = p_name AND parent_id = v_parent_id LIMIT 1;`)
  lines.push(`  END IF;`)
  lines.push(`  IF v_existing_id IS NOT NULL THEN`)
  lines.push(`    UPDATE categories SET sort_order = p_sort_order, published = true WHERE id = v_existing_id;`)
  lines.push(`    RETURN v_existing_id;`)
  lines.push(`  END IF;`)
  lines.push(`  INSERT INTO categories (name, description, image_url, published, sort_order, parent_id)`)
  lines.push(`  VALUES (p_name, p_description, p_image_url, true, p_sort_order, v_parent_id)`)
  lines.push(`  RETURNING id INTO v_new_id;`)
  lines.push(`  RETURN v_new_id;`)
  lines.push(`END;`)
  lines.push(`$$ LANGUAGE plpgsql;`)
  lines.push(``)

  lines.push(`-- Главные категории`)
  lines.push(`SELECT _upsert_cat('Мебель',                     '', '', 1, NULL);`)
  lines.push(`SELECT _upsert_cat('Освещение',                  '', '', 2, NULL);`)
  lines.push(`SELECT _upsert_cat('Аксессуары',                 '', '', 3, NULL);`)
  lines.push(`SELECT _upsert_cat('Для улицы',                  '', '', 4, NULL);`)
  lines.push(`SELECT _upsert_cat('Распродажа',                 '', '', 5, NULL);`)
  
  lines.push(``)
  lines.push(`-- Подкатегории Мебели`)
  lines.push(`SELECT _upsert_cat('Гостиная',               '', '', 1, 'Мебель');`)
  lines.push(`SELECT _upsert_cat('Спальня',                '', '', 2, 'Мебель');`)
  lines.push(`SELECT _upsert_cat('Кресла',                 '', '', 3, 'Мебель');`)
  lines.push(`SELECT _upsert_cat('Диваны',                 '', '', 4, 'Мебель');`)
  lines.push(`SELECT _upsert_cat('Столы',                  '', '', 5, 'Мебель');`)
  
  lines.push(``)
  lines.push(`-- Подкатегории столов`)
  lines.push(`SELECT _upsert_cat('Приставные столики',   '', '', 1, 'Столы');`)
  lines.push(`SELECT _upsert_cat('Консольные столы',     '', '', 2, 'Столы');`)
  lines.push(`SELECT _upsert_cat('Журнальные столы',     '', '', 3, 'Столы');`)
  lines.push(`SELECT _upsert_cat('Письменные столы',     '', '', 4, 'Столы');`)
  lines.push(`SELECT _upsert_cat('Обеденные столы',      '', '', 5, 'Столы');`)
  lines.push(`SELECT _upsert_cat('Барные столики',       '', '', 6, 'Столы');`)

  lines.push(``)
  lines.push(`-- Подкатегории Освещения`)
  lines.push(`SELECT _upsert_cat('Потолочное освещение',       '', '', 1, 'Освещение');`)
  lines.push(`SELECT _upsert_cat('Настольное освещение',       '', '', 2, 'Освещение');`)
  lines.push(`SELECT _upsert_cat('Настенное освещение',        '', '', 3, 'Освещение');`)

  lines.push(``)
  lines.push(`-- Подкатегории Аксессуаров`)
  lines.push(`SELECT _upsert_cat('Свечи и подсвечники',        '', '', 1, 'Аксессуары');`)
  lines.push(`SELECT _upsert_cat('Декор стен',                 '', '', 2, 'Аксессуары');`)

  lines.push(``)
  lines.push(`-- Подкатегории Для улицы`)
  lines.push(`SELECT _upsert_cat('Диваны для улицы | Кушетки', '', '', 1, 'Для улицы');`)
  lines.push(`SELECT _upsert_cat('Outdoor аксессуары',         '', '', 2, 'Для улицы');`)
  lines.push(`DROP FUNCTION _upsert_cat;`)
  lines.push(``)

  // ─── ЧАСТЬ 2: Продукты ───────────────────────────────────────────────────
  lines.push(`-- =================================================================`)
  lines.push(`-- ЧАСТЬ 2: Продукты (${products.length} товаров с eichholtz.kz)`)
  lines.push(`-- =================================================================`)
  lines.push(``)
  lines.push(`-- Временная таблица маппинга имён категорий → id`)
  lines.push(`CREATE TEMP TABLE _cat_map AS`)
  lines.push(`  SELECT id, name, parent_id FROM categories;`)
  lines.push(``)

  // Группируем по категории для читаемости
  const bySlug = {}
  for (const p of products) {
    const slug = p.category_slug || 'no-category'
    if (!bySlug[slug]) bySlug[slug] = []
    bySlug[slug].push(p)
  }

  const slugOrder = [
    'tables', 'chairs', 'sofas', 'living', 'bedroom', 'furniture',
    'lights', 'ceiling', 'table-lights', 'wall',
    'accessories', 'candles', 'wall-decor',
    'outdoor', 'sitting', 'tables-outdoor', 'accessories-outdoor',
    'new2', 'the-met', 'collection-january', 'corey-damen', 'maison-moghadam',
    'news', 'sale',
  ]

  // Сначала по порядку, потом остальные
  const orderedSlugs = [...slugOrder.filter(s => bySlug[s]), ...Object.keys(bySlug).filter(s => !slugOrder.includes(s))]

  for (const slug of orderedSlugs) {
    const prods = bySlug[slug]
    if (!prods?.length) continue

    const catName = SLUG_TO_CATEGORY[slug] ?? null
    lines.push(`-- ─────────────────────────────────────────────────────────────`)
    lines.push(`-- ${catName ? catName : `[${slug}] — без категории`} (${prods.length} товаров)`)
    lines.push(`-- ─────────────────────────────────────────────────────────────`)

    for (const p of prods) {
      const name = sqlStr(p.name)
      const descr = sqlStr(p.description)
      const imgUrl = sqlStr(p.image_url)
      const images = sqlStr(JSON.stringify(p.images || []))
      const specs = sqlStr(JSON.stringify(p.specs || {}))
      const category = sqlStr(catName || slug)

      if (catName) {
        lines.push(`INSERT INTO products (name, description, price, image_url, images, specs, in_stock, published, category, category_id)`)
        lines.push(`SELECT ${name}, ${descr}, 0, ${imgUrl}, ${images}::jsonb, ${specs}::jsonb, true, true, ${category},`)
        lines.push(`  (SELECT id FROM _cat_map WHERE name = ${category} LIMIT 1)`)
        lines.push(`WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${name} LIMIT 1);`)
      } else {
        lines.push(`INSERT INTO products (name, description, price, image_url, images, specs, in_stock, published, category)`)
        lines.push(`SELECT ${name}, ${descr}, 0, ${imgUrl}, ${images}::jsonb, ${specs}::jsonb, true, true, ${category}`)
        lines.push(`WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = ${name} LIMIT 1);`)
      }
    }
    lines.push(``)
  }

  lines.push(`DROP TABLE IF EXISTS _cat_map;`)
  lines.push(``)
  lines.push(`COMMIT;`)
  lines.push(``)
  lines.push(`-- Проверка:`)
  lines.push(`-- SELECT COUNT(*) FROM products;`)
  lines.push(`-- SELECT COALESCE(c.name,'[без категории]'), COUNT(p.id)`)
  lines.push(`--   FROM products p LEFT JOIN categories c ON c.id=p.category_id`)
  lines.push(`--   GROUP BY c.name ORDER BY COUNT(p.id) DESC;`)

  return lines.join('\n')
}

async function main() {
  console.log('Reading products_raw.json...')
  const products = JSON.parse(await fs.readFile(JSON_IN, 'utf-8'))
  console.log(`Found ${products.length} products`)

  console.log('Generating SQL...')
  const sql = generateSQL(products)

  await fs.writeFile(SQL_OUT, sql, 'utf-8')
  const stat = await fs.stat(SQL_OUT)
  console.log(`Saved to ${SQL_OUT} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`)

  // Статистика
  const byCat = {}
  for (const p of products) {
    const k = SLUG_TO_CATEGORY[p.category_slug] || `[${p.category_slug || 'none'}]`
    byCat[k] = (byCat[k] || 0) + 1
  }
  console.log('\nProducts breakdown:')
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })

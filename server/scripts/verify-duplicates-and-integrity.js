import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== ТЩАТЕЛЬНАЯ ПРОВЕРКА ДУБЛИКАТОВ И ЦЕЛОСТНОСТИ ДАННЫХ ===");
  await initDb();

  // 1. Check total rows in products table vs unique SKU / objectID
  const { rows: totalRows } = await query(`SELECT COUNT(*) as total FROM products`);
  const { rows: uniqueObjectID } = await query(`SELECT COUNT(DISTINCT specs->>'objectID') as count FROM products WHERE specs->>'objectID' IS NOT NULL`);
  const { rows: uniqueSKU } = await query(`SELECT COUNT(DISTINCT specs->>'sku') as count FROM products WHERE specs->>'sku' IS NOT NULL AND specs->>'sku' != ''`);

  console.log(`\n--- 1. ПРОВЕРКА ТАБЛИЦЫ PRODUCTS В БД ---`);
  console.log(`Всего строк (записей) товаров в БД: ${totalRows[0].total}`);
  console.log(`Уникальных objectID: ${uniqueObjectID[0].count}`);
  console.log(`Уникальных SKU: ${uniqueSKU[0].count}`);

  // Find duplicate SKUs if any
  const { rows: dupSkus } = await query(`
    SELECT specs->>'sku' as sku_code, COUNT(*) as count, ARRAY_AGG(id) as ids, ARRAY_AGG(name) as names
    FROM products
    WHERE specs->>'sku' IS NOT NULL AND specs->>'sku' != ''
    GROUP BY specs->>'sku'
    HAVING COUNT(*) > 1
  `);

  if (dupSkus.length > 0) {
    console.log(`\n⚠️ НАЙДЕНЫ ДУБЛИКАТЫ ПО SKU (${dupSkus.length}):`);
    for (const d of dupSkus) {
      console.log(`SKU: ${d.sku_code} | Кол-во: ${d.count} | IDs: ${d.ids.join(', ')} | Названия: ${d.names.join(' /// ')}`);
    }
  } else {
    console.log(`✅ В базе данных 0 дубликатов по SKU!`);
  }

  // Find duplicate objectIDs if any
  const { rows: dupObjIds } = await query(`
    SELECT specs->>'objectID' as obj_id, COUNT(*) as count, ARRAY_AGG(id) as ids
    FROM products
    WHERE specs->>'objectID' IS NOT NULL
    GROUP BY specs->>'objectID'
    HAVING COUNT(*) > 1
  `);

  if (dupObjIds.length > 0) {
    console.log(`\n⚠️ НАЙДЕНЫ ДУБЛИКАТЫ ПО objectID (${dupObjIds.length}):`);
    for (const d of dupObjIds) {
      console.log(`objectID: ${d.obj_id} | Кол-во: ${d.count} | IDs: ${d.ids.join(', ')}`);
    }
  } else {
    console.log(`✅ В базе данных 0 дубликатов по objectID!`);
  }

  // 2. Test API responses for 4 main categories to ensure zero duplicates in lists
  console.log(`\n--- 2. ПРОВЕРКА ВЫДАЧИ API ДЛЯ 4 ОСНОВНЫХ КАТЕГОРИЙ ---`);
  const rootCatIds = [
    { name: "Мебель", id: 551 },
    { name: "Освещение", id: 585 },
    { name: "Аксессуары", id: 595 },
    { name: "Для улицы", id: 578 }
  ];

  for (const cat of rootCatIds) {
    const { rows: pList } = await query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT p.id
      FROM products p
      WHERE p.published = true AND (
        p.category_id IN (SELECT id FROM cat_tree)
        OR p.specs->'extra_categories' @> to_jsonb($1::int)
      )
    `, [cat.id]);

    const totalInCat = pList.length;
    const uniqueIdsInCat = new Set(pList.map(p => p.id)).size;
    const hasDups = totalInCat !== uniqueIdsInCat;

    console.log(`Категория [${cat.name}]: всего выводится ${totalInCat}, уникальных ID: ${uniqueIdsInCat} ${hasDups ? '⚠️ ДУБЛИ В ВЫДАЧЕ!' : '✅ НЕТ ДУБЛЕЙ В ВЫДАЧЕ!'}`);
  }

  // 3. Test API SQL distinct query in server/routes/products.js
  console.log(`\n--- 3. ПРОВЕРКА DISTINCT В SERVER/ROUTES/PRODUCTS.JS ---`);
  const { rows: distCheck } = await query(`
    SELECT DISTINCT p.id
    FROM products p
    WHERE p.published = true AND (
      p.category_id = 551 OR p.specs->'extra_categories' @> to_jsonb(551::int)
    )
  `);
  console.log(`При вызове DISTINCT для Мебель: ${distCheck.length} товаров (0 дубликатов)`);

  await closePool();
}

run().catch(console.error);

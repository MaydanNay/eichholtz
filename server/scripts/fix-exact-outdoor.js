import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== СИНХРОНИЗАЦИЯ КАТЕГОРИИ ДЛЯ УЛИЦЫ (208 ТОВАРОВ 1-В-1) ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  await initDb();

  let page = 0;
  let allHits = [];
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facetFilters: [["categories.level1:Collection /// Outdoor"]],
        hitsPerPage: 500,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    allHits = allHits.concat(pageHits);
    if (pageHits.length === 0 || allHits.length >= (algData.nbHits || 0)) break;
    page++;
  }

  const uniqueMap = new Map();
  for (const h of allHits) uniqueMap.set(String(h.objectID), h);
  const uniqueHits = Array.from(uniqueMap.values());
  console.log(`Уникальных товаров в Outdoor из Algolia: ${uniqueHits.length}`);

  const { rows: treeRows } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = 578
      UNION ALL
      SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT id FROM cat_tree
  `);
  const validCatIds = new Set(treeRows.map(r => r.id));

  let updatedCount = 0;
  for (const h of uniqueHits) {
    const objId = String(h.objectID);
    const sku = h.sku ? String(h.sku) : null;
    const { rows } = await query(
      `SELECT id, category_id FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
      [objId, sku]
    );
    if (rows.length > 0) {
      const p = rows[0];
      if (!validCatIds.has(p.category_id)) {
        await query(`UPDATE products SET category_id = 578 WHERE id = $1`, [p.id]);
        updatedCount++;
      }
    }
  }

  const { rows: finalDb } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = 578
      UNION ALL
      SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT COUNT(DISTINCT p.id) as total
    FROM products p
    WHERE p.category_id IN (SELECT id FROM cat_tree)
  `);

  console.log(`[Для улицы] Привязано недостающих: ${updatedCount}. Новый итог в БД: ${finalDb[0].total} (в оригинале ${uniqueHits.length})`);

  await closePool();
}

run().catch(console.error);

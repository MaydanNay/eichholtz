import { query, initDb, closePool } from "../db.js";

async function fetchSubcategoryHits(key, subcat) {
  let hits = [];
  let page = 0;
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facetFilters: [[`categories.level2:${subcat}`]],
        hitsPerPage: 500,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name", "categories_without_path"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    hits = hits.concat(pageHits);
    if (pageHits.length === 0 || hits.length >= (algData.nbHits || 0)) {
      break;
    }
    page++;
  }
  return hits;
}

async function fetchLevel1Hits(key, level1) {
  let hits = [];
  let page = 0;
  while (true) {
    const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
      method: "POST",
      headers: {
        "X-Algolia-Application-Id": "L9823SLXQ4",
        "X-Algolia-API-Key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        facetFilters: [[`categories.level1:${level1}`]],
        hitsPerPage: 500,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name", "categories_without_path"]
      })
    });
    const algData = await algRes.json();
    const pageHits = algData.hits || [];
    hits = hits.concat(pageHits);
    if (pageHits.length === 0 || page >= 10 || hits.length >= (algData.nbHits || 0)) {
      break;
    }
    page++;
  }
  return hits;
}

async function run() {
  console.log("=== СИНХРОНИЗАЦИЯ КАТЕГОРИИ МЕБЕЛЬ (1267 ТОВАРОВ) ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  await initDb();

  const subcats = [
    "Collection /// Furniture /// Chairs",
    "Collection /// Furniture /// Tables",
    "Collection /// Furniture /// Sofas | Ottomans",
    "Collection /// Furniture /// Cabinets",
    "Collection /// Furniture /// Bedroom",
    "Collection /// Furniture /// Rugs | Carpets"
  ];

  let allHits = [];
  for (const sc of subcats) {
    const hits = await fetchSubcategoryHits(key, sc);
    allHits = allHits.concat(hits);
  }

  // Also add level1 Furniture hits
  const level1Hits = await fetchLevel1Hits(key, "Collection /// Furniture");
  allHits = allHits.concat(level1Hits);

  // Deduplicate hits by objectID
  const uniqueMap = new Map();
  for (const h of allHits) {
    uniqueMap.set(String(h.objectID), h);
  }
  const uniqueHits = Array.from(uniqueMap.values());
  console.log(`Уникальных товаров в Furniture из Algolia: ${uniqueHits.length}`);

  const algObjIds = new Set(uniqueHits.map(h => String(h.objectID)));
  const algSkus = new Set(uniqueHits.map(h => String(h.sku)).filter(Boolean));

  // Get valid category IDs for Furniture root (id 551)
  const { rows: treeRows } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = 551
      UNION ALL
      SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT id FROM cat_tree
  `);
  const validCategoryIds = new Set(treeRows.map(r => r.id));

  // Update products in DB
  for (const h of uniqueHits) {
    const objId = String(h.objectID);
    const sku = h.sku ? String(h.sku) : null;
    const { rows } = await query(
      `SELECT id, category_id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
      [objId, sku]
    );

    if (rows.length > 0) {
      const p = rows[0];
      const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
      specs.categories_without_path = h.categories_without_path || [];

      if (!validCategoryIds.has(p.category_id)) {
        await query(`UPDATE products SET category_id = 551, specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
      } else {
        await query(`UPDATE products SET specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
      }
    }
  }

  // Unlink products in DB category tree 551 that are NOT in uniqueHits
  const { rows: currentDbProds } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = 551
      UNION ALL
      SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT p.id, p.specs->>'objectID' as "obj_id", p.specs->>'sku' as "sku"
    FROM products p
    WHERE p.category_id IN (SELECT id FROM cat_tree)
  `);

  let unlinkedCount = 0;
  for (const p of currentDbProds) {
    const inAlg = algObjIds.has(String(p.obj_id)) || (p.sku && algSkus.has(String(p.sku)));
    if (!inAlg) {
      await query(`UPDATE products SET category_id = NULL WHERE id = $1`, [p.id]);
      unlinkedCount++;
    }
  }

  // Final count check
  const { rows: finalCount } = await query(`
    WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = 551
      UNION ALL
      SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT COUNT(DISTINCT p.id) as total
    FROM products p
    WHERE p.category_id IN (SELECT id FROM cat_tree)
  `);

  console.log(`[Мебель] Итог в БД: ${finalCount[0].total} (в оригинале 1267, отвязано лишних: ${unlinkedCount})`);

  await closePool();
}

run().catch(console.error);

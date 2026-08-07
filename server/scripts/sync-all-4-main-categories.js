import { query, initDb, closePool } from "../db.js";

async function fetchAllAlgoliaHits(key, level1Path) {
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
        facetFilters: [[`categories.level1:${level1Path}`]],
        hitsPerPage: 100,
        page: page,
        attributesToRetrieve: ["objectID", "sku", "name", "categoryIds", "categories", "categories_without_path"]
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

async function run() {
  console.log("=== СИНХРОНИЗАЦИЯ 4 ОСНОВНЫХ КАТЕГОРИЙ (FURNITURE, LIGHTING, ACCESSORIES, OUTDOOR) ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  await initDb();

  const configs = [
    { level1: "Collection /// Furniture", rootId: 551, name: "Мебель" },
    { level1: "Collection /// Lighting", rootId: 585, name: "Освещение" },
    { level1: "Collection /// Accessories", rootId: 595, name: "Аксессуары" },
    { level1: "Collection /// Outdoor", rootId: 578, name: "Для улицы" },
  ];

  for (const cfg of configs) {
    console.log(`\n--- Обработка ${cfg.name} (${cfg.level1}) ---`);
    const hits = await fetchAllAlgoliaHits(key, cfg.level1);
    console.log(`Получено из Algolia для ${cfg.name}: ${hits.length} товаров.`);

    const algObjIds = new Set(hits.map(h => String(h.objectID)));
    const algSkus = new Set(hits.map(h => String(h.sku)).filter(Boolean));

    // Get all category IDs in DB for this root tree
    const { rows: treeRows } = await query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT id FROM cat_tree
    `, [cfg.rootId]);
    const validCategoryIds = new Set(treeRows.map(r => r.id));

    // Update specs for exact items
    let updatedCount = 0;
    for (const h of hits) {
      const objId = String(h.objectID);
      const sku = h.sku ? String(h.sku) : null;
      const { rows } = await query(
        `SELECT id, category_id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
        [objId, sku]
      );

      if (rows.length > 0) {
        const p = rows[0];
        const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
        const catsWithoutPath = h.categories_without_path || [];
        specs.categories_without_path = catsWithoutPath;
        
        // Ensure category_id is within valid tree for this category if currently outside
        if (!validCategoryIds.has(p.category_id)) {
          await query(`UPDATE products SET category_id = $1, specs = $2 WHERE id = $3`, [cfg.rootId, JSON.stringify(specs), p.id]);
        } else {
          await query(`UPDATE products SET specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
        }
        updatedCount++;
      }
    }

    // Now remove any products from DB category tree that are NOT in the exact Algolia list
    const { rows: currentDbProds } = await query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT p.id, p.specs->>'objectID' as "obj_id", p.specs->>'sku' as "sku"
      FROM products p
      WHERE p.category_id IN (SELECT id FROM cat_tree)
    `, [cfg.rootId]);

    let unlinkedCount = 0;
    for (const p of currentDbProds) {
      const inAlg = algObjIds.has(String(p.obj_id)) || (p.sku && algSkus.has(String(p.sku)));
      if (!inAlg) {
        // Move product category_id to null or unassign from this root category
        await query(`UPDATE products SET category_id = NULL WHERE id = $1`, [p.id]);
        unlinkedCount++;
      }
    }

    // Check final count in DB
    const { rows: finalCount } = await query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      WHERE p.category_id IN (SELECT id FROM cat_tree)
    `, [cfg.rootId]);

    console.log(`[${cfg.name}] Итог в БД: ${finalCount[0].total} (в оригинале ${hits.length}, отвязано лишних: ${unlinkedCount})`);
  }

  await closePool();
}

run().catch(console.error);

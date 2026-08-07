import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== ТЩАТЕЛЬНЫЙ АУДИТ И СИНХРОНИЗАЦИЯ ВСЕХ ПОДКАТЕГОРИЙ И ПОДПОДКАТЕГОРИЙ ===");
  await initDb();

  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  // Fetch all categories from DB
  const { rows: dbCategories } = await query(`SELECT id, name, parent_id FROM categories ORDER BY id ASC`);
  console.log(`Всего категорий в БД: ${dbCategories.length}`);

  // Fetch all Algolia level2 and level3 facets
  const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": "L9823SLXQ4",
      "X-Algolia-API-Key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      facets: ["categories.level1", "categories.level2", "categories.level3"],
      hitsPerPage: 0
    })
  });
  const algData = await algRes.json();
  const facets = algData.facets || {};
  const algL2 = facets["categories.level2"] || {};
  const algL3 = facets["categories.level3"] || {};

  // Map DB categories with parent hierarchy
  const catById = new Map(dbCategories.map(c => [c.id, c]));

  // Build full path for DB category
  function getDbPath(catId) {
    const chain = [];
    let curr = catById.get(catId);
    while (curr) {
      chain.unshift(curr);
      curr = curr.parent_id ? catById.get(curr.parent_id) : null;
    }
    return chain;
  }

  // Audit each category in DB
  const auditResults = [];
  for (const cat of dbCategories) {
    const chain = getDbPath(cat.id);
    const depth = chain.length;

    // Check DB product count for this category tree
    const { rows: dbProdCount } = await query(`
      WITH RECURSIVE cat_tree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c INNER JOIN cat_tree ct ON c.parent_id = ct.id
      )
      SELECT COUNT(DISTINCT p.id) as count
      FROM products p
      WHERE p.published = true AND (
        p.category_id IN (SELECT id FROM cat_tree)
        OR p.specs->'extra_categories' @> to_jsonb($1::int)
      )
    `, [cat.id]);

    auditResults.push({
      id: cat.id,
      name: cat.name,
      depth: depth,
      parentName: chain.length > 1 ? chain[chain.length - 2].name : null,
      fullPath: chain.map(c => c.name).join(" > "),
      dbCount: parseInt(dbProdCount[0].count, 10)
    });
  }

  console.log("\n--- АУДИТ ПОДКАТЕГОРИЙ (Уровень 2 - Subcategories) ---");
  const level2Cats = auditResults.filter(r => r.depth === 2);
  for (const r of level2Cats) {
    console.log(`[L2] [${r.parentName} > ${r.name}] (ID: ${r.id}): ${r.dbCount} товаров`);
  }

  console.log("\n--- АУДИТ ПОДПОДКАТЕГОРИЙ (Уровень 3 - Sub-subcategories) ---");
  const level3Cats = auditResults.filter(r => r.depth >= 3);
  for (const r of level3Cats) {
    console.log(`[L3] [${r.fullPath}] (ID: ${r.id}): ${r.dbCount} товаров`);
  }

  await closePool();
}

run().catch(console.error);

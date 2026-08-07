import { query, initDb, closePool } from "../db.js";

async function syncNewArrivals() {
  console.log("=== СИНХРОНИЗАЦИЯ NEW ARRIVALS ИЗ ALGOLIA ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];
  if (!key) {
    console.error("API Key not found!");
    return;
  }

  const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": "L9823SLXQ4",
      "X-Algolia-API-Key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      facetFilters: [["categories.level2:Collection /// New /// New Arrivals"]],
      hitsPerPage: 1000,
      attributesToRetrieve: ["objectID", "name", "sku", "categories_without_path", "categories"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log(`Получено товаров New Arrivals из Algolia: ${hits.length}`);

  await initDb();

  let updatedCount = 0;
  for (const hit of hits) {
    const objId = String(hit.objectID);
    const sku = hit.sku ? String(hit.sku) : null;
    const catsWithoutPath = hit.categories_without_path || [];

    // Update specs->'extra_collections' in DB
    const { rows } = await query(
      `SELECT id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
      [objId, sku]
    );

    if (rows.length > 0) {
      const prod = rows[0];
      const specs = typeof prod.specs === 'object' ? { ...prod.specs } : {};
      const currentExtras = Array.isArray(specs.extra_collections) ? specs.extra_collections : [];
      
      const newExtras = Array.from(new Set([...currentExtras, ...catsWithoutPath, 'New Arrivals']));
      specs.extra_collections = newExtras;

      await query(
        `UPDATE products SET specs = $1 WHERE id = $2`,
        [JSON.stringify(specs), prod.id]
      );
      updatedCount++;
    }
  }

  console.log(`Успешно обновлено товаров в БД: ${updatedCount}`);

  const { rows: finalCheck } = await query(`
    SELECT COUNT(DISTINCT id) as total 
    FROM products 
    WHERE collection_id = 124 
       OR specs->'extra_collections' @> to_jsonb('New Arrivals'::text)
  `);
  console.log(`ИТОГО товаров New Arrivals в нашей БД теперь: ${finalCheck[0].total}`);

  await closePool();
}

syncNewArrivals().catch(console.error);

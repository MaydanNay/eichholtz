import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== СИНХРОНИЗАЦИЯ JANUARY 2026 COLLECTION ===");
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": "L9823SLXQ4",
      "X-Algolia-API-Key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      facetFilters: [["categories.level2:Collection /// New /// January 2026 Collection"]],
      hitsPerPage: 1000,
      attributesToRetrieve: ["objectID", "sku", "name"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log("Algolia exact January 2026 Collection count:", hits.length);

  await initDb();
  
  const janCollectionId = 125;

  // 1. Remove 'January 2026 Collection' from extra_collections for all products first
  const { rows: allProds } = await query(`
    SELECT id, specs FROM products WHERE specs->'extra_collections' @> to_jsonb('January 2026 Collection'::text)
  `);
  for (const p of allProds) {
    const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
    if (Array.isArray(specs.extra_collections)) {
      specs.extra_collections = specs.extra_collections.filter(c => c !== 'January 2026 Collection');
      await query(`UPDATE products SET specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
    }
  }

  // 2. Reset collection_id = NULL for products that had 125 but are not in the new list
  await query(`UPDATE products SET collection_id = NULL WHERE collection_id = $1`, [janCollectionId]);

  // 3. Set 'January 2026 Collection' in extra_collections and collection_id = 125 ONLY for the exact 283 Algolia items
  let count = 0;
  for (const h of hits) {
    const objId = String(h.objectID);
    const sku = h.sku ? String(h.sku) : null;
    const { rows } = await query(
      `SELECT id, specs FROM products WHERE specs->>'objectID' = $1 OR (specs->>'sku' = $2 AND $2 IS NOT NULL)`,
      [objId, sku]
    );

    if (rows.length > 0) {
      const p = rows[0];
      const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
      const current = Array.isArray(specs.extra_collections) ? specs.extra_collections : [];
      if (!current.includes('January 2026 Collection')) {
        current.push('January 2026 Collection');
      }
      specs.extra_collections = current;
      await query(`UPDATE products SET collection_id = $1, specs = $2 WHERE id = $3`, [janCollectionId, JSON.stringify(specs), p.id]);
      count++;
    }
  }

  console.log(`Updated exact ${count} products for January 2026 Collection.`);

  const { rows: finalCount } = await query(`
    SELECT COUNT(DISTINCT id) as total 
    FROM products 
    WHERE collection_id = $1 
       OR specs->'extra_collections' @> to_jsonb('January 2026 Collection'::text)
  `, [janCollectionId]);
  console.log(`Final DB count for January 2026 Collection: ${finalCount[0].total}`);

  await closePool();
}

run().catch(console.error);

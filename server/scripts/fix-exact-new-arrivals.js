import { query, initDb, closePool } from "../db.js";

async function run() {
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
      facetFilters: [["categories.level2:Collection /// New /// New Arrivals"]],
      hitsPerPage: 1000,
      attributesToRetrieve: ["objectID", "sku", "name"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log("Algolia exact New Arrivals count:", hits.length);

  await initDb();
  
  // 1. Remove 'New Arrivals' from extra_collections for all products first
  const { rows: allProds } = await query(`
    SELECT id, specs FROM products WHERE specs->'extra_collections' @> to_jsonb('New Arrivals'::text)
  `);
  for (const p of allProds) {
    const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
    if (Array.isArray(specs.extra_collections)) {
      specs.extra_collections = specs.extra_collections.filter(c => c !== 'New Arrivals');
      await query(`UPDATE products SET specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
    }
  }

  // 2. Also reset collection_id = NULL for products that had 124 but are not in the new 279 list
  await query(`UPDATE products SET collection_id = NULL WHERE collection_id = 124`);

  // 3. Now set 'New Arrivals' in extra_collections and collection_id = 124 ONLY for the exact 279 Algolia items
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
      if (!current.includes('New Arrivals')) {
        current.push('New Arrivals');
      }
      specs.extra_collections = current;
      await query(`UPDATE products SET collection_id = 124, specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
      count++;
    }
  }

  console.log(`Updated exact ${count} products for New Arrivals.`);

  const { rows: finalCount } = await query(`
    SELECT COUNT(DISTINCT id) as total 
    FROM products 
    WHERE collection_id = 124 
       OR specs->'extra_collections' @> to_jsonb('New Arrivals'::text)
  `);
  console.log(`Final DB count for New Arrivals: ${finalCount[0].total}`);

  await closePool();
}

run().catch(console.error);

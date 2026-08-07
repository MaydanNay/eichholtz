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
      facetFilters: [["categories.level2:Collection /// New /// The Met x Eichholtz"]],
      hitsPerPage: 1000,
      attributesToRetrieve: ["objectID", "sku", "name"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log("Algolia exact The Met x Eichholtz count:", hits.length);

  await initDb();
  
  // 1. Remove 'The Met x Eichholtz' and 'The Met' from extra_collections for ALL products
  const { rows: allProds } = await query(`
    SELECT id, specs FROM products WHERE specs->'extra_collections' @> to_jsonb('The Met x Eichholtz'::text) OR specs->'extra_collections' @> to_jsonb('The Met'::text)
  `);
  for (const p of allProds) {
    const specs = typeof p.specs === 'object' ? { ...p.specs } : {};
    if (Array.isArray(specs.extra_collections)) {
      specs.extra_collections = specs.extra_collections.filter(c => c !== 'The Met x Eichholtz' && c !== 'The Met');
      await query(`UPDATE products SET specs = $1 WHERE id = $2`, [JSON.stringify(specs), p.id]);
    }
  }

  // 2. Also reset collection_id = NULL for products that had 135 (or collection 125) but are not in the exact 177 list
  const { rows: collRows } = await query(`SELECT id FROM collections WHERE name ILIKE '%The Met%' LIMIT 1`);
  const metCollectionId = collRows[0]?.id || 135;
  await query(`UPDATE products SET collection_id = NULL WHERE collection_id = $1`, [metCollectionId]);

  // 3. Now set collection_id and extra_collections ONLY for the exact 177 Algolia items
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
      if (!current.includes('The Met x Eichholtz')) current.push('The Met x Eichholtz');
      if (!current.includes('The Met')) current.push('The Met');
      specs.extra_collections = current;
      await query(`UPDATE products SET collection_id = $1, specs = $2 WHERE id = $3`, [metCollectionId, JSON.stringify(specs), p.id]);
      count++;
    }
  }

  console.log(`Updated exact ${count} products for The Met x Eichholtz.`);

  const { rows: finalCount } = await query(`
    SELECT COUNT(DISTINCT id) as total 
    FROM products 
    WHERE collection_id = $1 
       OR specs->'extra_collections' @> to_jsonb('The Met x Eichholtz'::text)
  `, [metCollectionId]);
  console.log(`Final DB count for The Met x Eichholtz: ${finalCount[0].total}`);

  await closePool();
}

run().catch(console.error);

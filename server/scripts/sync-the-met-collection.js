import { query, initDb, closePool } from "../db.js";

async function run() {
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  // Algolia query for The Met x Eichholtz
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
      attributesToRetrieve: ["objectID", "sku", "name", "categories_without_path"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log("Algolia exact The Met x Eichholtz count:", hits.length);

  await initDb();

  // Find collection_id for 'The Met x Eichholtz'
  const { rows: collRows } = await query(`SELECT id FROM collections WHERE name ILIKE '%The Met%' LIMIT 1`);
  const metCollectionId = collRows[0]?.id || 125;
  console.log(`The Met collection ID in DB: ${metCollectionId}`);

  // Reset extra_collections 'The Met x Eichholtz' and 'The Met'
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

  // Update exact hits from Algolia
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
       OR specs->'extra_collections' @> to_jsonb('The Met'::text)
  `, [metCollectionId]);
  console.log(`Final DB count for The Met x Eichholtz: ${finalCount[0].total}`);

  await closePool();
}

run().catch(console.error);

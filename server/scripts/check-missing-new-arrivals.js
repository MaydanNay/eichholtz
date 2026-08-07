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
      attributesToRetrieve: ["objectID", "name", "sku", "image_url", "thumbnail_url", "price"]
    })
  });
  const algData = await algRes.json();
  const hits = algData.hits || [];
  console.log("Algolia hits count:", hits.length);

  await initDb();
  const { rows: dbRows } = await query(
    `SELECT id, name, specs->>'objectID' as obj_id, specs->>'sku' as sku 
     FROM products 
     WHERE collection_id = $1 
        OR specs->'extra_collections' @> to_jsonb($2::text) 
        OR specs::text LIKE $3`,
    [124, 'New Arrivals', '%"New Arrivals"%']
  );
  console.log("DB count:", dbRows.length);

  const dbObjIds = new Set(dbRows.map(r => r.obj_id).filter(Boolean));
  const dbSkus = new Set(dbRows.map(r => r.sku).filter(Boolean));

  const missing = hits.filter(h => !dbObjIds.has(String(h.objectID)) && !dbSkus.has(String(h.sku)));
  console.log("Missing items count:", missing.length);
  missing.forEach((m, i) => console.log(`${i+1}. [objectID: ${m.objectID}, sku: ${m.sku}] ${m.name}`));

  await closePool();
}

run().catch(console.error);

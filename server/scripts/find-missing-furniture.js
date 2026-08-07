import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  async function fetchCategoryHits(level1Path) {
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
          hitsPerPage: 500,
          page: page,
          attributesToRetrieve: ["objectID", "sku", "name"]
        })
      });
      const algData = await algRes.json();
      const pageHits = algData.hits || [];
      hits = hits.concat(pageHits);
      if (pageHits.length === 0 || page >= 10 || hits.length >= (algData.nbHits || 0)) break;
      page++;
    }
    return hits;
  }

  async function fetchLevel2Hits(level2Path) {
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
          facetFilters: [[`categories.level2:${level2Path}`]],
          hitsPerPage: 500,
          page: page,
          attributesToRetrieve: ["objectID", "sku", "name"]
        })
      });
      const algData = await algRes.json();
      const pageHits = algData.hits || [];
      hits = hits.concat(pageHits);
      if (pageHits.length === 0 || page >= 10 || hits.length >= (algData.nbHits || 0)) break;
      page++;
    }
    return hits;
  }

  let hits = await fetchCategoryHits("Collection /// Furniture");
  const furnitureSubcats = [
    "Collection /// Furniture /// Chairs",
    "Collection /// Furniture /// Tables",
    "Collection /// Furniture /// Sofas | Ottomans",
    "Collection /// Furniture /// Cabinets",
    "Collection /// Furniture /// Bedroom",
    "Collection /// Furniture /// Rugs | Carpets"
  ];
  for (const sc of furnitureSubcats) {
    const subHits = await fetchLevel2Hits(sc);
    hits = hits.concat(subHits);
  }

  const dedupMap = new Map();
  for (const h of hits) dedupMap.set(String(h.objectID), h);
  const uniqueHits = Array.from(dedupMap.values());
  console.log("Algolia total unique Furniture hits:", uniqueHits.length);

  const { rows: dbRows } = await query(`SELECT id, name, specs->>'objectID' as "obj_id", specs->>'sku' as "sku" FROM products`);
  const dbObjIds = new Set(dbRows.map(r => String(r.obj_id)));
  const dbSkus = new Set(dbRows.map(r => String(r.sku)).filter(Boolean));

  const missing = uniqueHits.filter(h => !dbObjIds.has(String(h.objectID)) && !dbSkus.has(String(h.sku)));
  console.log("Missing item count:", missing.length);
  console.log("Missing item details:", JSON.stringify(missing, null, 2));

  await closePool();
}

run().catch(console.error);

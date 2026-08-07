import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
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
      facets: ["categories.level1", "categories.level2", "categories.level3"],
      hitsPerPage: 0
    })
  });
  const algData = await algRes.json();
  const facets = algData.facets || {};
  
  console.log("=== ALGOLIA LEVEL 2 FACETS ===");
  console.log(JSON.stringify(facets["categories.level2"] || {}, null, 2));

  console.log("=== ALGOLIA LEVEL 3 FACETS ===");
  console.log(JSON.stringify(facets["categories.level3"] || {}, null, 2));

  await closePool();
}

run().catch(console.error);

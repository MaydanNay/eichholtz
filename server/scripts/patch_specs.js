import db from './server/db.js';

const APP_ID = 'L9823SLXQ4';
const API_KEY = 'ZTFlMGExYWIwMDg3MGMwYzRmZDZkYTAyNzc3MDJkYjNjNDUxNGMxMjFkZTY1ZjEyMGJhNzZlMzVkMTgzMGFiMGZpbHRlcnM9Y2F0YWxvZ19wZXJtaXNzaW9ucy5jdXN0b21lcl9ncm91cF8xJTIwJTIxJTNEJTIwMCZ0YWdGaWx0ZXJzPSZ2YWxpZFVudGlsPTE3ODM5NzA0OTA=';

async function fetchAllAlgolia() {
  let allHits = [];
  let page = 0;
  let nbPages = 1;
  while(page < nbPages) {
    const res = await fetch(`https://${APP_ID}-dsn.algolia.net/1/indexes/live_magento2_en_products/query`, {
      method: 'POST',
      headers: { 'X-Algolia-Application-Id': APP_ID, 'X-Algolia-API-Key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: `query=&page=${page}&hitsPerPage=1000` })
    });
    const data = await res.json();
    if (!data.hits) break;
    nbPages = data.nbPages;
    allHits = allHits.concat(data.hits);
    page++;
  }
  return allHits;
}

async function fix() {
  console.log('Fetching all Algolia products...');
  const hits = await fetchAllAlgolia();
  console.log(`Fetched ${hits.length} products. Updating DB...`);
  
  let updated = 0;
  for (const hit of hits) {
    if (!hit.sku) continue;
    if (hit.fabric || hit.shape || hit.finish) {
      const { rows } = await db.query("SELECT id, specs FROM products WHERE specs->>'sku' = $1 LIMIT 1", [hit.sku]);
      if (rows[0]) {
        const id = rows[0].id;
        const specs = typeof rows[0].specs === 'string' ? JSON.parse(rows[0].specs) : rows[0].specs;
        
        let changed = false;
        if (hit.fabric && specs.fabric !== hit.fabric) { specs.fabric = hit.fabric; changed = true; }
        if (hit.shape && specs.shape !== hit.shape) { specs.shape = hit.shape; changed = true; }
        if (hit.finish && specs.finish !== hit.finish) { specs.finish = hit.finish; changed = true; }
        
        if (changed) {
          await db.query('UPDATE products SET specs = $1 WHERE id = $2', [JSON.stringify(specs), id]);
          updated++;
        }
      }
    }
  }
  console.log(`Updated specs for ${updated} products in DB.`);
  process.exit(0);
}

fix().catch(console.error);

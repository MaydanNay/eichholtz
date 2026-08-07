import fetch from 'node-fetch';
import db from '../db.js';

const APP_ID = 'L9823SLXQ4';
const API_KEY = 'ZTFlMGExYWIwMDg3MGMwYzRmZDZkYTAyNzc3MDJkYjNjNDUxNGMxMjFkZTY1ZjEyMGJhNzZlMzVkMTgzMGFiMGZpbHRlcnM9Y2F0YWxvZ19wZXJtaXNzaW9ucy5jdXN0b21lcl9ncm91cF8xJTIwJTIxJTNEJTIwMCZ0YWdGaWx0ZXJzPSZ2YWxpZFVudGlsPTE3ODM5NzA0OTA=';

async function getCollectionSKUs(collectionName) {
  let skus = [];
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
    for (const hit of data.hits) {
      if (hit.categories) {
        let found = false;
        for (const lvl in hit.categories) {
          if (hit.categories[lvl].some(c => c.includes(collectionName))) {
            found = true;
            break;
          }
        }
        if (found) skus.push(hit.sku);
      }
    }
    page++;
  }
  return skus;
}

async function fix() {
  const collections = ['New Collection - January 2026', 'New Arrivals', 'Corey Damen Jenkins', 'The Met x Eichholtz'];
  for (const name of collections) {
    console.log(`Fetching SKUs for ${name}...`);
    const skus = await getCollectionSKUs(name);
    console.log(`Found ${skus.length} SKUs for ${name}`);
    if (skus.length === 0) continue;
    
    const { rows } = await db.query('SELECT id FROM collections WHERE name ILIKE $1 LIMIT 1', [name]);
    if (rows[0]) {
      const colId = rows[0].id;
      // We stored sku in specs jsonb
      let updated = 0;
      for (const sku of skus) {
        const res = await db.query("UPDATE products SET collection_id = $1 WHERE specs->>'sku' = $2", [colId, sku]);
        updated += res.rowCount;
      }
      console.log(`Linked ${updated} existing products to ${name}`);
    }
  }
  process.exit(0);
}

fix().catch(console.error);

import { query, initDb, closePool } from "../db.js";

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function run() {
  await initDb();

  // Test for 118465
  const sku = '118465';
  const prefix = sku.substring(0, 1) + '/' + sku.substring(1, 2) + '/' + sku;
  console.log(`Checking CDN gallery images for SKU ${sku} (prefix: ${prefix})...`);

  for (let i = 0; i <= 10; i++) {
    const url = `https://cdn.eichholtz.com/media/catalog/product/${prefix}_${i}_1.jpg`;
    const exists = await checkUrl(url);
    console.log(`Index ${i}: ${url} -> ${exists ? 'EXISTS (200)' : '404/Missing'}`);
  }

  await closePool();
}

run().catch(console.error);

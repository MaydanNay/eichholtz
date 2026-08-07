import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
  const { rows } = await query(`SELECT id, name, category, specs FROM products`);

  const coreyProducts = [];
  for (const p of rows) {
    const str = JSON.stringify(p).toLowerCase();
    if (str.includes("corey")) {
      coreyProducts.push(p);
    }
  }

  console.log(`=== НАЙДЕНО ТОВАРОВ ДЛЯ COREY DAMEN JENKINS: ${coreyProducts.length} ===`);
  const skuCounts = {};
  for (const p of coreyProducts) {
    const sku = p.specs?.sku || 'no-sku';
    skuCounts[sku] = (skuCounts[sku] || 0) + 1;
    console.log(`ID: ${p.id} | SKU: ${sku} | Name: ${p.name}`);
  }

  console.log("\nSKU Counts:", skuCounts);
  await closePool();
}

run().catch(console.error);

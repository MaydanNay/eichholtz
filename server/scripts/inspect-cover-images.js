import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
  const { rows } = await query(`SELECT id, name, image_url, images, specs FROM products WHERE id = 11730 OR specs->>'sku' = '120934'`);
  for (const r of rows) {
    console.log(`ID: ${r.id} | Name: ${r.name}`);
    console.log("image_url:", r.image_url);
    console.log("images:", r.images);
    console.log("specs keys:", Object.keys(r.specs || {}));
  }
  await closePool();
}

run().catch(console.error);

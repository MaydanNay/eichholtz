import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
  const { rows } = await query(`SELECT id, name, specs FROM products WHERE specs IS NOT NULL LIMIT 10`);
  for (const r of rows) {
    console.log(`=== Product ${r.id}: ${r.name} ===`);
    console.log("specs keys:", Object.keys(r.specs || {}));
    if (r.specs.dimensions) console.log("dimensions:", r.specs.dimensions);
    if (r.specs.specifications) console.log("specifications keys:", Object.keys(r.specs.specifications || {}));
  }
  await closePool();
}

run().catch(console.error);

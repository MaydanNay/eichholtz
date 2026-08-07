import { query, initDb, closePool } from "../db.js";

async function run() {
  await initDb();
  const { rows } = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'products'`);
  console.log("Columns:", rows.map(r => r.column_name));
  await closePool();
}

run().catch(console.error);

import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== ПРИВЯЗКА БРЕНДОВЫХ КОЛЛЕКЦИЙ (THE MET X EICHHOLTZ = ID 127) ===");
  await initDb();

  const metCollId = 127; // The Met x Eichholtz
  const cdjCollId = 128; // Corey Damen Jenkins

  const { rows: products } = await query(`SELECT id, name, collection_id, specs FROM products`);

  let metUpdated = 0;
  let cdjUpdated = 0;

  for (const p of products) {
    const str = JSON.stringify(p.specs || {}).toLowerCase();

    if (str.includes("corey damen jenkins") || str.includes("corey")) {
      if (p.collection_id !== cdjCollId) {
        await query(`UPDATE products SET collection_id = $1 WHERE id = $2`, [cdjCollId, p.id]);
        cdjUpdated++;
      }
    } else if (str.includes("the met") || str.includes("the met x eichholtz")) {
      if (p.collection_id !== metCollId) {
        await query(`UPDATE products SET collection_id = $1 WHERE id = $2`, [metCollId, p.id]);
        metUpdated++;
      }
    }
  }

  console.log(`\n✅ УСПЕШНО ПЕРЕПРИВЯЗАНО!`);
  console.log(`Товаров привязано к Corey Damen Jenkins (ID ${cdjCollId}): ${cdjUpdated}`);
  console.log(`Товаров привязано к The Met x Eichholtz (ID ${metCollId}): ${metUpdated}`);

  await closePool();
}

run().catch(console.error);

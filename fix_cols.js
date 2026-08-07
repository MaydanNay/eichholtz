const db = require('./server/db');
async function run() {
  const season = await db.query('SELECT id FROM seasons LIMIT 1');
  const seasonId = season.rows[0]?.id;
  
  if (!seasonId) {
    console.log('Season not found');
    return;
  }

  const toHide = ['Accessories', 'Lighting', 'New', 'Outdoor', 'Furniture', 'Коллекция зима 2025', 'Maison Moghadam'];
  for (const name of toHide) {
    await db.query('UPDATE collections SET published = false WHERE name = $1', [name]);
  }

  const na = await db.query('SELECT id FROM collections WHERE name = $1 LIMIT 1', ['New Arrivals']);
  if (!na.rows[0]) {
    await db.query('INSERT INTO collections (season_id, name, published, kind) VALUES ($1, $2, true, $3)', [seasonId, 'New Arrivals', 'category']);
  } else {
    await db.query('UPDATE collections SET published = true, season_id = $1 WHERE id = $2', [seasonId, na.rows[0].id]);
  }

  console.log('Updated collections in NEW season.');
  process.exit();
}
run().catch(console.error);

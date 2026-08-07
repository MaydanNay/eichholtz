const db = require('./server/db');
async function check() {
  for (const c of ['New Collection - January 2026', 'New Arrivals', 'Corey Damen Jenkins', 'The Met x Eichholtz']) {
    const res = await db.query('SELECT count(*) FROM products p JOIN collections col ON p.collection_id = col.id WHERE col.name = $1', [c]);
    console.log(c, '=>', res.rows[0].count);
  }
  process.exit();
}
check();

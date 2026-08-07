const db = require('./server/db');
async function run() {
  const prods = await db.query('SELECT category_id, COUNT(*) as count FROM products GROUP BY category_id ORDER BY count DESC LIMIT 10');
  const ids = prods.rows.map(r => r.category_id).filter(id => id);
  console.log('Top IDs:', ids);
  for (const id of ids) {
    const cat = await db.query('SELECT id, name, parent_id FROM categories WHERE id = $1', [id]);
    console.log(cat.rows[0]);
  }
  process.exit(0);
}
run();

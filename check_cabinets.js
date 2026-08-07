const db = require('./server/db');
async function run() {
  const children = await db.query("SELECT id, name FROM categories WHERE parent_id = 562");
  console.log('Children of Шкафы:', children.rows);
  for (const child of children.rows) {
    const prods = await db.query('SELECT count(*) as count FROM products WHERE category_id = $1', [child.id]);
    console.log('Child', child.name, 'has products:', prods.rows[0].count);
  }
  process.exit(0);
}
run();

const db = require('./server/db');

async function fixDupes3() {
  const pairs = [
    { name: 'Османы', keep: 581, remove: 665 },
    { name: 'Комоды', keep: 564, remove: 690 },
  ];

  for (const p of pairs) {
    console.log(`Merging ${p.name} from ${p.remove} to ${p.keep}`);
    await db.query('UPDATE products SET category_id = $1 WHERE category_id = $2', [p.keep, p.remove]);
    await db.query('UPDATE categories SET parent_id = $1 WHERE parent_id = $2', [p.keep, p.remove]);
    await db.query('DELETE FROM categories WHERE id = $1', [p.remove]);
  }

  console.log('Done.');
  process.exit(0);
}

fixDupes3().catch(console.error);

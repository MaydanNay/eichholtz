const db = require('./server/db');

async function fixDupes2() {
  const pairs = [
    { name: 'Кресла', parent: 554, keep: 555, remove: 693 },
    { name: 'Обеденные стулья', parent: 554, keep: 561, remove: 694 },
    { name: 'Барные шкафы', parent: 562, keep: 570, remove: 692 },
  ];

  for (const p of pairs) {
    console.log(`Merging ${p.name} from ${p.remove} to ${p.keep}`);
    await db.query('UPDATE products SET category_id = $1 WHERE category_id = $2', [p.keep, p.remove]);
    await db.query('UPDATE categories SET parent_id = $1 WHERE parent_id = $2', [p.keep, p.remove]);
    await db.query('DELETE FROM categories WHERE id = $1', [p.remove]);
  }

  console.log('Remaining duplicates removed.');
  process.exit(0);
}

fixDupes2().catch(console.error);

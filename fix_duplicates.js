const db = require('./server/db');

async function fixDuplicates() {
  const mapping = [
    { from: 'Шкафы и стеллажи', to: 'Шкафы' },
    { from: 'Шкафы-витрины', to: 'Витрины' },
    { from: 'Барные шкафы', to: 'Барные шкафы', parentId: 687, toParentId: 562 },
    { from: 'Стулья и кресла', to: 'Стулья' },
    { from: 'Кресла', to: 'Кресла', parentId: 688, toParentId: 554 },
    { from: 'Обеденные стулья', to: 'Обеденные стулья', parentId: 688, toParentId: 554 },
    { from: 'Барные стулья', to: 'Барные и кухонные стулья' }
  ];

  for (const m of mapping) {
    let fromCat;
    if (m.parentId) {
      fromCat = await db.query('SELECT id FROM categories WHERE name = $1 AND parent_id = $2', [m.from, m.parentId]);
    } else {
      // Find highest ID, which is the newly created duplicate if any
      fromCat = await db.query('SELECT id FROM categories WHERE name = $1 ORDER BY id DESC LIMIT 1', [m.from]);
    }

    if (fromCat.rows.length === 0) continue;
    const fromId = fromCat.rows[0].id;

    let toCat;
    if (m.toParentId) {
      toCat = await db.query('SELECT id FROM categories WHERE name = $1 AND parent_id = $2', [m.to, m.toParentId]);
    } else {
      toCat = await db.query('SELECT id FROM categories WHERE name = $1 ORDER BY id ASC LIMIT 1', [m.to]);
    }

    if (toCat.rows.length === 0) continue;
    const toId = toCat.rows[0].id;

    if (fromId === toId) continue;

    console.log(`Moving products from ${m.from} (${fromId}) to ${m.to} (${toId})`);
    await db.query('UPDATE products SET category_id = $1 WHERE category_id = $2', [toId, fromId]);
    
    // Check if there are any child categories that belong to fromId
    // If so, move them to toId
    await db.query('UPDATE categories SET parent_id = $1 WHERE parent_id = $2', [toId, fromId]);

    // Finally delete fromId
    await db.query('DELETE FROM categories WHERE id = $1', [fromId]);
  }

  // Double check and delete any leftover empty 'Шкафы и стеллажи' or 'Стулья и кресла'
  await db.query(`DELETE FROM categories WHERE name IN ('Шкафы и стеллажи', 'Стулья и кресла', 'Шкафы-витрины', 'Барные стулья') AND id NOT IN (SELECT DISTINCT parent_id FROM categories WHERE parent_id IS NOT NULL)`);

  console.log('Duplicates removed.');
  process.exit(0);
}

fixDuplicates().catch(console.error);

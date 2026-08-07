import db from './server/db.js';

(async () => {
  const { rows } = await db.query('SELECT id, parent_id, name FROM categories');
  const toHide = new Set();
  const namesToHide = ['New', 'Inspiration'];

  rows.forEach(r => {
    if (namesToHide.includes(r.name)) toHide.add(r.id);
  });

  let changed = true;
  while(changed) {
    changed = false;
    rows.forEach(r => {
      if (r.parent_id && toHide.has(r.parent_id) && !toHide.has(r.id)) {
        toHide.add(r.id);
        changed = true;
      }
    });
  }

  if (toHide.size > 0) {
    const ids = Array.from(toHide).join(',');
    await db.query(`UPDATE categories SET published = false WHERE id IN (${ids})`);
    console.log('Unpublished', toHide.size, 'categories');
  }
  process.exit(0);
})();

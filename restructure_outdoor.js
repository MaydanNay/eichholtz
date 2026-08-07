const db = require('./server/db');

async function run() {
  console.log('Restructuring Outdoor (Для улицы)...');
  const outdoorRes = await db.query("SELECT id FROM categories WHERE name = 'Для улицы' AND parent_id IS NULL");
  if (!outdoorRes.rows[0]) {
    console.error('Для улицы not found');
    process.exit(1);
  }
  const accId = outdoorRes.rows[0].id;

  // 1. Уличные диваны | Шезлонги
  await db.query("UPDATE categories SET name = 'Уличные диваны | Шезлонги', published = true WHERE name = 'Уличные диваны и шезлонги' AND parent_id = $1", [accId]);
  
  // 2. Уличные стулья
  await db.query("UPDATE categories SET name = 'Уличные стулья', published = true WHERE name = 'Уличные кресла и стулья' AND parent_id = $1", [accId]);

  // 3. Столики на открытом воздухе
  await db.query("UPDATE categories SET name = 'Столики на открытом воздухе', published = true WHERE name = 'Уличные столы' AND parent_id = $1", [accId]);
  const tableIdRes = await db.query("SELECT id FROM categories WHERE name = 'Столики на открытом воздухе' AND parent_id = $1", [accId]);
  if (tableIdRes.rows[0]) {
    const tableId = tableIdRes.rows[0].id;
    await db.query("UPDATE categories SET name = 'Кофейные столики на открытом воздухе', published = true WHERE name = 'Журнальные столики для улицы' AND parent_id = $1", [tableId]);
    await db.query("UPDATE categories SET name = 'Столы для обеда на открытом воздухе', published = true WHERE name = 'Обеденные столы для улицы' AND parent_id = $1", [tableId]);
    await db.query("UPDATE categories SET name = 'Уличные консольные столики', published = true WHERE name = 'Консольные столы для улицы' AND parent_id = $1", [tableId]);
    await db.query("UPDATE categories SET name = 'Уличные столики', published = true WHERE name = 'Приставные столики для улицы' AND parent_id = $1", [tableId]);
  }

  // 4, 5, 6, 7 (No subcategories, just rename)
  await db.query("UPDATE categories SET name = 'Ковры для улицы', published = true WHERE name = 'Уличные ковры' AND parent_id = $1", [accId]);
  await db.query("UPDATE categories SET name = 'Аксессуары для улицы', published = true WHERE name = 'Уличные аксессуары' AND parent_id = $1", [accId]);
  await db.query("UPDATE categories SET name = 'Наружное освещение', published = true WHERE name = 'Уличное освещение' AND parent_id = $1", [accId]);
  await db.query("UPDATE categories SET name = 'Чехлы для улицы', published = true WHERE name = 'Чехлы для уличной мебели' AND parent_id = $1", [accId]);

  // Make sure all sub-children are published too
  const children = await db.query("SELECT id FROM categories WHERE parent_id = $1", [accId]);
  for (const child of children.rows) {
    await db.query("UPDATE categories SET published = true WHERE parent_id = $1", [child.id]);
    await db.query("UPDATE categories SET published = true WHERE id = $1", [child.id]);
  }

  console.log('Restructuring complete.');
  process.exit(0);
}

run().catch(console.error);

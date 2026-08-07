const db = require('./server/db');

async function run() {
  console.log('Restructuring Accessories...');
  const accRes = await db.query("SELECT id FROM categories WHERE name = 'Аксессуары' AND parent_id IS NULL");
  if (!accRes.rows[0]) {
    console.error('Аксессуары not found');
    process.exit(1);
  }
  const accId = accRes.rows[0].id;

  // 1. Rename Настенный декор -> Настенные украшения
  await db.query("UPDATE categories SET name = 'Настенные украшения' WHERE name = 'Настенный декор' AND parent_id = $1", [accId]);
  // 1a. Постеры и картины -> Отпечатки
  await db.query("UPDATE categories SET name = 'Отпечатки' WHERE name = 'Постеры и картины'");

  // 2. Декоративные предметы (children renames)
  await db.query("UPDATE categories SET name = 'Боулз' WHERE name = 'Чаши'");
  await db.query("UPDATE categories SET name = 'Коробки' WHERE name = 'Шкатулки'");
  await db.query("UPDATE categories SET name = 'Декоративные предметы' WHERE name = 'Декоративные объекты'");
  await db.query("UPDATE categories SET name = 'Рамки для картин' WHERE name = 'Фоторамки'");
  await db.query("UPDATE categories SET name = 'Статуи' WHERE name = 'Статуэтки'");

  // 3. Подсвечники | Подсвечники
  // Rename parent to 'Подсвечники | Подсвечники'
  await db.query("UPDATE categories SET name = 'Подсвечники | Подсвечники' WHERE name = 'Подсвечники' AND parent_id = $1", [accId]);
  const newCandleIdRes = await db.query("SELECT id FROM categories WHERE name = 'Подсвечники | Подсвечники' AND parent_id = $1", [accId]);
  if (newCandleIdRes.rows[0]) {
    const parentCandleId = newCandleIdRes.rows[0].id;
    // The subcategory "Подсвечники" (597) was under parentCandleId. Let's make sure its parent is parentCandleId.
    // Also move 'Свечи' and 'Стеклянные колбы для свечей' (which were under 597) to be under parentCandleId directly.
    const subCandleRes = await db.query("SELECT id FROM categories WHERE name = 'Подсвечники' AND parent_id = $1", [parentCandleId]);
    if (subCandleRes.rows[0]) {
      const subCandleId = subCandleRes.rows[0].id;
      // Move children from subCandleId to parentCandleId
      await db.query("UPDATE categories SET parent_id = $1 WHERE parent_id = $2", [parentCandleId, subCandleId]);
    }
    // Rename 'Стеклянные колбы для свечей' to 'Ураганы'
    await db.query("UPDATE categories SET name = 'Ураганы' WHERE name = 'Стеклянные колбы для свечей'");
  }

  // 4. Искусственные цветы и зелень
  const icRes = await db.query("SELECT id FROM categories WHERE name = 'Искусственные цветы и зелень' AND parent_id = $1", [accId]);
  if (icRes.rows.length === 0) {
    await db.query("INSERT INTO categories (name, parent_id, sort_order) VALUES ('Искусственные цветы и зелень', $1, 80)", [accId]);
  }

  // 5. Вазы | Кашпо
  let vaseParentId;
  const vaseRes = await db.query("SELECT id FROM categories WHERE name = 'Вазы | Кашпо' AND parent_id = $1", [accId]);
  if (vaseRes.rows.length === 0) {
    const newVase = await db.query("INSERT INTO categories (name, parent_id, sort_order) VALUES ('Вазы | Кашпо', $1, 90) RETURNING id", [accId]);
    vaseParentId = newVase.rows[0].id;
  } else {
    vaseParentId = vaseRes.rows[0].id;
  }
  
  // Insert 'Вазы' and 'Плантаторы'
  const v1 = await db.query("SELECT id FROM categories WHERE name = 'Вазы' AND parent_id = $1", [vaseParentId]);
  if (v1.rows.length === 0) await db.query("INSERT INTO categories (name, parent_id, sort_order) VALUES ('Вазы', $1, 10)", [vaseParentId]);
  
  const v2 = await db.query("SELECT id FROM categories WHERE name = 'Плантаторы' AND parent_id = $1", [vaseParentId]);
  if (v2.rows.length === 0) await db.query("INSERT INTO categories (name, parent_id, sort_order) VALUES ('Плантаторы', $1, 20)", [vaseParentId]);

  // 6. Аксессуары для сервировки
  // "Подносы" -> "Аксессуары для сервировки"
  // "Подставки для вина" -> "Винные стеллажи"
  await db.query("UPDATE categories SET name = 'Аксессуары для сервировки' WHERE name = 'Подносы'");
  await db.query("UPDATE categories SET name = 'Винные стеллажи' WHERE name = 'Подставки для вина'");

  // 7. Вешалки для одежды | Подставки для зонтов и многое другое
  await db.query("UPDATE categories SET name = 'Вешалки для одежды | Подставки для зонтов и многое другое' WHERE name = 'Вешалки и зонтницы'");
  await db.query("UPDATE categories SET name = 'Вешалки для одежды' WHERE name = 'Вешалки'");
  await db.query("UPDATE categories SET name = 'Подставки для зонтов' WHERE name = 'Зонтницы'");
  await db.query("UPDATE categories SET name = 'Аксессуары для камина' WHERE name = 'Каминные принадлежности'");
  await db.query("UPDATE categories SET name = 'Аксессуары для ванной комнаты' WHERE name = 'Аксессуары для ванной'");

  console.log('Restructuring complete.');
  process.exit(0);
}

run().catch(console.error);

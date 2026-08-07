const db = require('./server/db');

async function run() {
  // Шкафы
  await db.query(`UPDATE categories SET name = 'Шкафы' WHERE name = 'Шкафы и стеллажи' AND parent_id = 551`);
  await db.query(`UPDATE categories SET name = 'Витрины' WHERE name = 'Шкафы-витрины'`);
  await db.query(`UPDATE categories SET name = 'Тумбы под телевизор' WHERE name = 'ТВ-тумбы'`);

  // Стулья
  await db.query(`UPDATE categories SET name = 'Стулья' WHERE name = 'Стулья и кресла' AND parent_id = 551`);
  await db.query(`UPDATE categories SET name = 'Барные и кухонные стулья' WHERE name = 'Барные стулья'`);
  await db.query(`UPDATE categories SET name = 'Стулья' WHERE name = 'Табуреты'`);

  // Диваны | Пуфики
  await db.query(`UPDATE categories SET name = 'Османы' WHERE name = 'Пуфики' OR name = 'Пуфы'`);
  await db.query(`UPDATE categories SET name = 'Скамейки' WHERE name = 'Скамьи'`);

  // Столы
  await db.query(`UPDATE categories SET name = 'Кофейные столики' WHERE name = 'Журнальные столики'`);
  await db.query(`UPDATE categories SET name = 'Столы' WHERE name = 'Письменные столы'`);
  await db.query(`UPDATE categories SET name = 'Тележки' WHERE name = 'Сервировочные столики'`);
  await db.query(`UPDATE categories SET name = 'Барные стойки | Подносы для дворецкого' WHERE name = 'Бары и подносы'`);
  await db.query(`UPDATE categories SET name = 'Колонки' WHERE name = 'Колонны'`);

  console.log('Categories renamed successfully.');
  process.exit(0);
}

run().catch(console.error);

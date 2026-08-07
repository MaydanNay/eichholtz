import { query, initDb, closePool } from "../db.js";

async function isPlaceholder(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return true;
    const buf = await res.arrayBuffer();
    return buf.byteLength < 15000;
  } catch {
    return true;
  }
}

async function run() {
  console.log("=== ПОЛНАЯ ЧИСТКА ЗАГЛУШЕК ДЛЯ ВСЕХ 3024 ТОВАРОВ В БАЗЕ ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
  `);

  console.log(`Начало проверки ${products.length} товаров...`);

  let updatedCount = 0;
  let totalPlaceholdersRemoved = 0;
  const batchSize = 30;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (p) => {
        const rawImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (rawImages.length <= 1) return;

        const results = await Promise.all(
          rawImages.map(async (url) => {
            const bad = await isPlaceholder(url);
            return bad ? null : url;
          })
        );

        const validImages = results.filter(Boolean);
        const removed = rawImages.length - validImages.length;

        if (removed > 0) {
          const finalImages = validImages.length > 0 ? validImages : (p.image_url ? [p.image_url] : []);
          const mainImg = finalImages[0] || p.image_url;

          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImg, JSON.stringify(finalImages), p.id]
          );

          updatedCount++;
          totalPlaceholdersRemoved += removed;
        }
      })
    );

    if ((i + batchSize) % 300 === 0 || i + batchSize >= products.length) {
      console.log(`Прогресс: ${Math.min(i + batchSize, products.length)} / ${products.length} товаров (очищено карточек: ${updatedCount}, удалено заглушек: ${totalPlaceholdersRemoved})...`);
    }
  }

  console.log(`\n🎉 ВСЕ ТОВАРЫ В БАЗЕ УСПЕШНО ОЧИЩЕНЫ!`);
  console.log(`Всего очищено карточек товаров: ${updatedCount}`);
  console.log(`Всего удалено заглушек Eichholtz: ${totalPlaceholdersRemoved}`);

  await closePool();
}

run().catch(console.error);

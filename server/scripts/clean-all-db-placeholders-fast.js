import { query, initDb, closePool } from "../db.js";

async function getUrlSize(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return 0;
    const buf = await res.arrayBuffer();
    return buf.byteLength;
  } catch {
    return 0;
  }
}

async function run() {
  console.log("=== ФИНАЛЬНАЯ ЧИСТКА ВСЕХ ГАЛЕРЕЙ В БАЗЕ ДАННЫХ ОТ ЗАГЛУШЕК EICHHOLTZ (5795 BYTES) ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
  `);

  console.log(`Запуск параллельной проверки для ${products.length} товаров...`);

  let updatedCount = 0;
  let totalPlaceholdersRemoved = 0;
  const batchSize = 25;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (p) => {
        const rawImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (rawImages.length <= 1) return;

        const sizes = await Promise.all(rawImages.map((url) => getUrlSize(url)));

        const validImages = rawImages.filter((_, idx) => sizes[idx] > 15000);
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

    if ((i + batchSize) % 250 === 0 || i + batchSize >= products.length) {
      console.log(`Прогресс: ${Math.min(i + batchSize, products.length)} / ${products.length} товаров... (очищено карточек: ${updatedCount}, удалено заглушек: ${totalPlaceholdersRemoved})`);
    }
  }

  console.log(`\n🎉 ВСЕ ТОВАРЫ В БАЗЕ УСПЕШНО ОЧИЩЕНЫ ОТ ЗАГЛУШЕК!`);
  console.log(`Всего очищено карточек товаров: ${updatedCount}`);
  console.log(`Всего удалено серых заглушек Eichholtz: ${totalPlaceholdersRemoved}`);

  await closePool();
}

run().catch(console.error);

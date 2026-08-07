import { query, initDb, closePool } from "../db.js";

async function isPlaceholderUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return true;
    const buf = await res.arrayBuffer();
    // Dummy placeholders are 5795 bytes (or under 15000 bytes)
    return buf.byteLength < 15000;
  } catch {
    return true;
  }
}

async function run() {
  console.log("=== БЫСТРАЯ ОЧИСТКА ВСЕХ ГАЛЕРЕЙ ОТ СЕРЫХ ЗАГЛУШЕК EICHHOLTZ ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
  `);

  console.log(`Проверяем ${products.length} товаров...`);

  let cleanedProducts = 0;
  let totalRemovedPlaceholders = 0;
  const concurrency = 30;

  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (p) => {
        const rawImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (rawImages.length <= 1) return;

        const results = await Promise.all(
          rawImages.map(async (url) => {
            const bad = await isPlaceholderUrl(url);
            return bad ? null : url;
          })
        );

        const validImages = results.filter(Boolean);
        const removed = rawImages.length - validImages.length;

        if (removed > 0 || JSON.stringify(validImages) !== JSON.stringify(p.images)) {
          const finalImages = validImages.length > 0 ? validImages : (p.image_url ? [p.image_url] : []);
          const mainImg = finalImages[0] || p.image_url;

          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImg, JSON.stringify(finalImages), p.id]
          );

          cleanedProducts++;
          totalRemovedPlaceholders += removed;
        }
      })
    );

    if ((i + concurrency) % 150 === 0 || i + concurrency >= products.length) {
      console.log(`Прогресс: ${Math.min(i + concurrency, products.length)} / ${products.length} товаров (удалено заглушек: ${totalRemovedPlaceholders})...`);
    }
  }

  console.log(`\n🎉 ОЧИСТКА ЗАВЕРШЕНА!`);
  console.log(`Очищено карточек товаров: ${cleanedProducts}`);
  console.log(`Удалено серых заглушек: ${totalRemovedPlaceholders}`);

  await closePool();
}

run().catch(console.error);

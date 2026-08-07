import { query, initDb, closePool } from "../db.js";

const cache = new Map();

async function getUrlByteSize(url) {
  if (cache.has(url)) return cache.get(url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      cache.set(url, 0);
      return 0;
    }
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    cache.set(url, size);
    return size;
  } catch {
    cache.set(url, 0);
    return 0;
  }
}

async function run() {
  console.log("=== ПОЛНАЯ ЧИСТКА ВСЕХ ЗАГЛУШЕК ВО ВСЕХ КАРТОЧКАХ ТОВАРОВ В БАЗЕ ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
  `);

  console.log(`Запуск проверки для всех ${products.length} товаров...`);

  let updatedCount = 0;
  let totalRemoved = 0;
  const batchSize = 30;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (p) => {
        const raw = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (raw.length === 0) return;

        // Check sizes for ALL images in gallery
        const sizes = await Promise.all(raw.map((url) => getUrlByteSize(url)));

        // Valid images must NOT be equal to 5795 bytes and must be > 15000 bytes
        const valid = raw.filter((_, idx) => sizes[idx] > 15000 && sizes[idx] !== 5795);
        const removed = raw.length - valid.length;

        if (removed > 0) {
          const mainImg = valid[0] || p.image_url;
          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImg, JSON.stringify(valid), p.id]
          );
          updatedCount++;
          totalRemoved += removed;
        }
      })
    );

    if ((i + batchSize) % 300 === 0 || i + batchSize >= products.length) {
      console.log(`Прогресс: ${Math.min(i + batchSize, products.length)} / ${products.length} (очищено карточек: ${updatedCount}, удалено серых заглушек: ${totalRemoved})`);
    }
  }

  console.log(`\n🎉 ВСЕ ТОВАРЫ ПОЛНОСТЬЮ И ИДЕАЛЬНО ОЧИЩЕНЫ ОТ ЗАГЛУШЕК!`);
  console.log(`Всего очищено карточек: ${updatedCount}`);
  console.log(`Всего удалено серых заглушек Eichholtz: ${totalRemoved}`);

  await closePool();
}

run().catch(console.error);

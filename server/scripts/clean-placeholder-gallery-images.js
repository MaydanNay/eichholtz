import { query, initDb, closePool } from "../db.js";

async function isPlaceholder(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = res.headers.get('content-length');
    if (len && Number(len) <= 10000) {
      return true;
    }
    // Fallback: if no Content-Length header, do a GET request to check size
    if (!len) {
      const getRes = await fetch(url);
      const buf = await getRes.arrayBuffer();
      return buf.byteLength <= 10000;
    }
    return false;
  } catch {
    return true; // Remove broken URLs
  }
}

async function run() {
  console.log("=== ОЧИСТКА ГАЛЕРЕЙ ОТ ЗАГЛУШЕК EICHHOLTZ (PLACEHOLDER 5.7KB) ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
  `);

  console.log(`Проверка ${products.length} товаров...`);

  let updatedCount = 0;
  let placeholdersRemoved = 0;
  const batchSize = 20;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (p) => {
        const rawImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (rawImages.length === 0) return;

        const validImages = [];
        let removedInProd = 0;

        for (const imgUrl of rawImages) {
          const bad = await isPlaceholder(imgUrl);
          if (bad) {
            removedInProd++;
          } else {
            validImages.push(imgUrl);
          }
        }

        if (removedInProd > 0 || JSON.stringify(validImages) !== JSON.stringify(p.images)) {
          const finalImages = validImages.length > 0 ? validImages : (p.image_url ? [p.image_url] : []);
          const mainImage = finalImages[0] || p.image_url;

          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImage, JSON.stringify(finalImages), p.id]
          );

          updatedCount++;
          placeholdersRemoved += removedInProd;
        }
      })
    );

    if ((i + batchSize) % 250 === 0 || i + batchSize >= products.length) {
      console.log(`Обработано: ${Math.min(i + batchSize, products.length)} / ${products.length} товаров... (удалено заглушек: ${placeholdersRemoved})`);
    }
  }

  console.log(`\n🎉 ВСЕ ГАЛЕРЕИ ОЧИЩЕНЫ ОТ ЗАГЛУШЕК!`);
  console.log(`Очищено товаров: ${updatedCount}`);
  console.log(`Всего удалено серых заглушек Eichholtz: ${placeholdersRemoved}`);

  await closePool();
}

run().catch(console.error);

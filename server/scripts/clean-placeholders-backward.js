import { query, initDb, closePool } from "../db.js";

async function isPlaceholderUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return true;
    const buf = await res.arrayBuffer();
    return buf.byteLength < 15000;
  } catch {
    return true;
  }
}

async function cleanProductGallery(images) {
  if (!Array.isArray(images) || images.length <= 1) return images;
  const cleanList = [...images];

  // Probe backwards from the end of gallery
  while (cleanList.length > 1) {
    const lastUrl = cleanList[cleanList.length - 1];
    const bad = await isPlaceholderUrl(lastUrl);
    if (bad) {
      cleanList.pop();
    } else {
      break; // Found the last real image, stop probing!
    }
  }

  return cleanList;
}

async function run() {
  console.log("=== СВЕРХБЫСТРАЯ ОБРАТНАЯ ЧИСТКА ГАЛЕРЕЙ ОТ СЕРЫХ ЗАГЛУШЕК ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images
    FROM products
    WHERE jsonb_array_length(images) > 1
  `);

  console.log(`Найдено ${products.length} товаров с галереями > 1 кадра...`);

  let updatedCount = 0;
  let totalRemoved = 0;
  const concurrency = 40;

  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);

    await Promise.all(
      batch.map(async (p) => {
        const raw = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        if (raw.length <= 1) return;

        const clean = await cleanProductGallery(raw);
        const removed = raw.length - clean.length;

        if (removed > 0) {
          const mainImg = clean[0] || p.image_url;
          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImg, JSON.stringify(clean), p.id]
          );
          updatedCount++;
          totalRemoved += removed;
        }
      })
    );

    if ((i + concurrency) % 300 === 0 || i + concurrency >= products.length) {
      console.log(`Прогресс: ${Math.min(i + concurrency, products.length)} / ${products.length} товаров (очищено: ${updatedCount}, удалено заглушек: ${totalRemoved})...`);
    }
  }

  console.log(`\n🎉 ВСЕ ТОВАРЫ УСПЕШНО ОЧИЩЕНЫ!`);
  console.log(`Всего очищено карточек: ${updatedCount}`);
  console.log(`Всего удалено заглушек: ${totalRemoved}`);

  await closePool();
}

run().catch(console.error);

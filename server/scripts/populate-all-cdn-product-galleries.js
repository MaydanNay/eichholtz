import { query, initDb, closePool } from "../db.js";

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function fetchGalleryForSku(sku, currentImages) {
  if (!sku) return currentImages;
  const skuStr = String(sku).trim();
  if (skuStr.length < 2) return currentImages;

  const prefix = `${skuStr[0]}/${skuStr[1]}/${skuStr}`;
  const discoveredImages = [];

  // Probe indices 0 to 15 in parallel
  const probeIndices = Array.from({ length: 16 }, (_, i) => i);
  const results = await Promise.all(
    probeIndices.map(async (i) => {
      const url = `https://cdn.eichholtz.com/media/catalog/product/${prefix}_${i}_1.jpg`;
      const ok = await checkUrl(url);
      return ok ? { index: i, url } : null;
    })
  );

  for (const r of results) {
    if (r) discoveredImages.push(r.url);
  }

  // Combine with existing own images if any unique URLs were missed
  const merged = [...discoveredImages];
  if (Array.isArray(currentImages)) {
    for (const img of currentImages) {
      if (!merged.includes(img) && img.includes(skuStr)) {
        merged.push(img);
      }
    }
  }

  return merged.length > 0 ? merged : currentImages;
}

async function run() {
  console.log("=== НАЧАЛО АВТОМАТИЧЕСКОЙ ЗАГРУЗКИ ПОЛНЫХ ГАЛЕРЕЙ ДЛЯ ВСЕХ ТОВАРОВ С EICHHOLTZ CDN ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images, specs
    FROM products
  `);

  console.log(`Найдено ${products.length} товаров. Запуск параллельной проверки кадров...`);

  let updatedCount = 0;
  let totalImagesFound = 0;
  const batchSize = 25;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (p) => {
        const sku = p.specs?.sku ? String(p.specs.sku).trim() : null;
        if (!sku) return;

        const gallery = await fetchGalleryForSku(sku, p.images);
        if (gallery && gallery.length > 0 && JSON.stringify(gallery) !== JSON.stringify(p.images)) {
          const mainImage = gallery[0] || p.image_url;
          await query(
            `UPDATE products SET image_url = $1, images = $2 WHERE id = $3`,
            [mainImage, JSON.stringify(gallery), p.id]
          );
          updatedCount++;
          totalImagesFound += gallery.length;
        }
      })
    );

    if ((i + batchSize) % 250 === 0 || i + batchSize >= products.length) {
      console.log(`Обработано: ${Math.min(i + batchSize, products.length)} / ${products.length} товаров... (обновлено галерей: ${updatedCount})`);
    }
  }

  console.log(`\n🎉 ВСЕ ГАЛЕРЕИ УСПЕШНО ЗАГРУЖЕНЫ И ОБНОВЛЕНЫ!`);
  console.log(`Обновлено товаров с богатыми галереями: ${updatedCount}`);
  console.log(`Всего кадров в галереях: ${totalImagesFound}`);

  await closePool();
}

run().catch(console.error);

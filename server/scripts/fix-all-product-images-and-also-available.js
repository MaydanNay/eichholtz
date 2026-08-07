import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== ОЧИСТКА ГАЛЕРЕЙ ТОВАРОВ И ВЫДЕЛЕНИЕ ALSO AVAILABLE (ПОСМОТРИТЕ ТАКЖЕ) ===");
  await initDb();

  const { rows: products } = await query(`
    SELECT id, name, image_url, images, specs
    FROM products
  `);

  console.log(`Проверка галерей для ${products.length} товаров...`);

  let cleanedImagesCount = 0;
  let alsoAvailableTaggedCount = 0;

  for (const p of products) {
    const sku = p.specs?.sku ? String(p.specs.sku).trim() : null;
    if (!sku) continue;

    let imgList = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (imgList.length === 0 && p.image_url) imgList = [p.image_url];

    const ownImages = [];
    const foreignSkus = new Set();

    for (const img of imgList) {
      // Extract filename / SKU from URL
      // e.g. https://cdn.eichholtz.com/media/catalog/product/1/2/120934_0_1.jpg -> 120934
      const match = img.match(/\/([0-9]{5,6})[_.]/);
      const imgSku = match ? match[1] : null;

      if (!imgSku || imgSku === sku) {
        ownImages.push(img);
      } else {
        // This image belongs to a foreign SKU (Also Available item!)
        foreignSkus.add(imgSku);
      }
    }

    const specs = typeof p.specs === 'object' && p.specs !== null ? { ...p.specs } : {};
    const foreignSkuList = Array.from(foreignSkus);

    let needsUpdate = false;

    // Check if ownImages is different from current p.images
    if (ownImages.length > 0 && JSON.stringify(ownImages) !== JSON.stringify(p.images)) {
      needsUpdate = true;
      cleanedImagesCount++;
    }

    if (foreignSkuList.length > 0) {
      specs.also_available_skus = foreignSkuList;
      needsUpdate = true;
      alsoAvailableTaggedCount++;
    }

    if (needsUpdate) {
      const finalImages = ownImages.length > 0 ? ownImages : (p.image_url ? [p.image_url] : []);
      const finalMainImage = finalImages[0] || p.image_url;

      await query(
        `UPDATE products SET image_url = $1, images = $2, specs = $3 WHERE id = $4`,
        [finalMainImage, JSON.stringify(finalImages), JSON.stringify(specs), p.id]
      );
    }
  }

  console.log(`\n✅ Готово!`);
  console.log(`Очищено галерей с чужими фото: ${cleanedImagesCount}`);
  console.log(`Привязано также доступных артикулов (Also available): ${alsoAvailableTaggedCount}`);

  await closePool();
}

run().catch(console.error);

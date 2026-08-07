import { query, initDb, closePool } from "../db.js";

async function run() {
  console.log("=== ИМПОРТ НЕДОСТАЮЩЕГО ТОВАРА: Chair Sienna (SKU 113196, objectID 10340) ===");
  await initDb();

  const sku = "113196";
  const objectID = "10340";
  const name = "Стул Sienna";
  
  const pageRes = await fetch("https://www.eichholtz.com/en/");
  const html = await pageRes.text();
  const key = html.match(/"apiKey"\s*:\s*"([^"]+)"/)?.[1];

  const algRes = await fetch("https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query", {
    method: "POST",
    headers: {
      "X-Algolia-Application-Id": "L9823SLXQ4",
      "X-Algolia-API-Key": key,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: sku,
      hitsPerPage: 1
    })
  });
  const algData = await algRes.json();
  const hit = algData.hits?.[0] || {};

  const imageUrl = hit.image_url || "https://www.eichholtz.com/media/catalog/product/1/1/113196.jpg";
  const description = "Изысканный стул Sienna от Eichholtz в обивке из бархата Savona серый цвета.";
  
  const specs = {
    objectID: objectID,
    sku: sku,
    categories_without_path: ["Furniture", "Chairs", "Armchairs"],
    extra_categories: [551],
    color: "Grey",
    fabric: ["Savona", "Velvet"]
  };

  const { rows } = await query(
    `INSERT INTO products (name, category_id, category, description, image_url, images, price, published, specs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      name,
      551, // Furniture
      "Furniture",
      description,
      imageUrl,
      JSON.stringify([imageUrl]),
      125000,
      true,
      JSON.stringify(specs)
    ]
  );

  console.log(`Успешно импортирован товар Chair Sienna. Новый ID в БД: ${rows[0].id}`);

  await closePool();
}

run().catch(console.error);

import { query } from '../db.js'

async function run() {
  try {
    // 1. Create a default season
    let seasonId;
    const { rows: seasons } = await query("SELECT id FROM seasons WHERE name = 'Новые коллекции 2026'")
    if (seasons.length > 0) {
      seasonId = seasons[0].id
    } else {
      const res = await query("INSERT INTO seasons (name, published, show_on_home) VALUES ('Новые коллекции 2026', true, true) RETURNING id")
      seasonId = res.rows[0].id
    }

    // 2. Create the default collection
    let collectionId;
    const { rows: colls } = await query("SELECT id FROM collections WHERE name = 'Новая коллекция 2026'")
    if (colls.length > 0) {
      collectionId = colls[0].id
    } else {
      const res = await query("INSERT INTO collections (season_id, name, published, kind, show_on_home) VALUES ($1, 'Новая коллекция 2026', true, 'category', true) RETURNING id", [seasonId])
      collectionId = res.rows[0].id
    }

    // 3. Migrate category images to products in this collection
    const { rows: categories } = await query("SELECT id, name, image_url FROM categories WHERE image_url != '' AND image_url IS NOT NULL")
    
    for (const cat of categories) {
      const { rows: existingProducts } = await query("SELECT id FROM products WHERE category_id = $1 AND collection_id = $2", [cat.id, collectionId])
      if (existingProducts.length === 0) {
        await query(
          "INSERT INTO products (name, category_id, collection_id, image_url, images, price, published) VALUES ($1, $2, $3, $4, $5, 0, true)",
          [`Обложка для ${cat.name}`, cat.id, collectionId, cat.image_url, JSON.stringify([cat.image_url])]
        )
      }
    }

    console.log('Migration successful!')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  }
}

run()

import { query } from '../db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function seedDefaultCategories() {
  try {
    const dataPath = path.join(__dirname, 'categories_data.json')
    if (!fs.existsSync(dataPath)) return

    const rawData = fs.readFileSync(dataPath, 'utf-8')
    const categories = JSON.parse(rawData)

    // Sort topologically (parents first) to prevent foreign key errors on empty DB
    const sortedCategories = []
    const remaining = [...categories]
    while (remaining.length > 0) {
      let progress = false
      for (let i = 0; i < remaining.length; i++) {
        const cat = remaining[i]
        if (!cat.parent_id || sortedCategories.find(s => s.id === cat.parent_id)) {
          sortedCategories.push(cat)
          remaining.splice(i, 1)
          i--
          progress = true
        }
      }
      if (!progress) {
        // If there are circular dependencies or missing parents, just dump the rest
        sortedCategories.push(...remaining)
        break
      }
    }

    for (const cat of sortedCategories) {
      await query(`
        INSERT INTO categories (id, name, description, image_url, sort_order, published, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          sort_order = EXCLUDED.sort_order,
          published = EXCLUDED.published,
          parent_id = EXCLUDED.parent_id
      `, [
        cat.id, 
        cat.name, 
        cat.description || '', 
        cat.image_url || '', 
        cat.sort_order || 0, 
        cat.published !== false, 
        cat.parent_id || null
      ])
    }

    // Update sequence to max id so new inserts work correctly
    await query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);

    console.log(`Seeded ${categories.length} categories from categories_data.json successfully.`)

    // Ensure all products with a category string match their category_id
    // This connects scraped products to the right ID
    await query(`
      UPDATE products p
      SET category_id = c.id
      FROM categories c
      WHERE p.category_id IS NULL
        AND p.category <> ''
        AND p.category = c.name
    `)
  } catch (error) {
    console.error('Error seeding default categories:', error)
  }
}

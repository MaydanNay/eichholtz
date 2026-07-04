import { query } from '../db.js'

export const DEFAULT_CATEGORIES = [
  { name: 'Столы', image_url: '/images/categories/stoly.jpg', sort_order: 1 },
  { name: 'Кресла', image_url: '/images/categories/kresla.jpg', sort_order: 2 },
  { name: 'Диваны', image_url: '/images/categories/divany.jpg', sort_order: 3 },
  { name: 'Освещение', image_url: '/images/categories/osveshchenie.jpg', sort_order: 4 },
  { name: 'Спальня', image_url: '/images/categories/spalnya.jpg', sort_order: 5 },
  { name: 'Люстры', image_url: '/images/categories/lyustry.jpg', sort_order: 6 },
  { name: 'Аксессуары', image_url: '/images/categories/aksessuary.jpg', sort_order: 7 },
  { name: 'Для улицы', image_url: '/images/categories/outdoor.jpg', sort_order: 8 },
]

export async function seedDefaultCategories() {
  for (const item of DEFAULT_CATEGORIES) {
    const { rows: existing } = await query(
      `SELECT id FROM categories WHERE name = $1 LIMIT 1`,
      [item.name],
    )

    if (existing[0]) {
      await query(
        `UPDATE categories
         SET image_url = CASE WHEN COALESCE(image_url, '') = '' THEN $1 ELSE image_url END,
             sort_order = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [item.image_url, item.sort_order, existing[0].id],
      )
      continue
    }

    await query(
      `INSERT INTO categories (name, description, image_url, published, sort_order)
       VALUES ($1, '', $2, true, $3)`,
      [item.name, item.image_url, item.sort_order],
    )
  }

  await query(`
    UPDATE products p
    SET category_id = c.id
    FROM categories c
    WHERE p.category_id IS NULL
      AND p.category <> ''
      AND p.category = c.name
  `)

  await query(`
    UPDATE products p
    SET category_id = c.id
    FROM collections coll
    JOIN categories c ON c.name = coll.name
    WHERE p.collection_id = coll.id
      AND coll.kind = 'category'
      AND p.category_id IS NULL
  `)
}

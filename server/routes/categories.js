import { Router } from 'express'
import { query } from '../db.js'
import { isAdminRequest, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { published, collection_id } = req.query
    let text = 'SELECT * FROM categories'
    const params = []

    if (collection_id) {
      params.push(collection_id)
      let hideCondition = ''
      if (req.query.all_for_admin !== '1') {
        hideCondition = ` AND NOT (
          COALESCE((SELECT hidden_categories FROM collections WHERE id = $1), '[]'::jsonb) @> to_jsonb(c.id)
        )`
      }
      text = `
        SELECT c.id, c.name, c.description, c.published, c.sort_order, c.created_at, c.updated_at, c.parent_id,
          COALESCE(
            NULLIF(
              (SELECT category_images->>c.id::text FROM collections WHERE id = $1),
              ''
            ),
            NULLIF(
              (SELECT p.image_url FROM products p WHERE p.category_id = c.id AND p.collection_id = $1 AND p.image_url != '' LIMIT 1),
              ''
            ),
            c.image_url
          ) as image_url
        FROM categories c
        WHERE 1=1 ${hideCondition}
      `
    }

    if (published === '1' || (!isAdminRequest(req) && published !== '0')) {
      text += (collection_id ? ' AND c.published = true' : ' WHERE published = true')
    }

    text += (collection_id ? ' ORDER BY c.sort_order ASC, c.created_at DESC' : ' ORDER BY sort_order ASC, created_at DESC')

    const { rows } = await query(text, params)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Категория не найдена' })
    if (!rows[0].published && !isAdminRequest(req)) {
      return res.status(404).json({ error: 'Категория не найдена' })
    }
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, image_url, published, sort_order, parent_id } = req.body
  if (!name) return res.status(400).json({ error: 'Название обязательно' })

  try {
    const { rows } = await query(
      `INSERT INTO categories (name, description, image_url, published, sort_order, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || '', image_url || '', published !== false, sort_order ?? 0, parent_id || null],
    )
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM categories WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Категория не найдена' })

    const e = existing[0]
    const { name, description, image_url, published, sort_order, parent_id } = req.body

    const { rows } = await query(
      `UPDATE categories
       SET name = $1, description = $2, image_url = $3, published = $4,
           sort_order = $5, parent_id = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name ?? e.name,
        description ?? e.description,
        image_url ?? e.image_url,
        published !== undefined ? published : e.published,
        sort_order ?? e.sort_order,
        parent_id !== undefined ? (parent_id || null) : e.parent_id,
        req.params.id,
      ],
    )
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Категория не найдена' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

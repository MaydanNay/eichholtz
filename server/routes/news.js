import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { published } = req.query
    let text = 'SELECT * FROM news'
    if (published === '1') text += ' WHERE published = true'
    text += ' ORDER BY created_at DESC'

    const { rows } = await query(text)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM news WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Новость не найдена' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { title, content, image_url, published } = req.body
  if (!title) return res.status(400).json({ error: 'Заголовок обязателен' })

  try {
    const { rows } = await query(
      `INSERT INTO news (title, content, image_url, published)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content || '', image_url || '', !!published],
    )
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM news WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Новость не найдена' })

    const e = existing[0]
    const { title, content, image_url, published } = req.body

    const { rows } = await query(
      `UPDATE news
       SET title = $1, content = $2, image_url = $3, published = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        title ?? e.title,
        content ?? e.content,
        image_url ?? e.image_url,
        published !== undefined ? published : e.published,
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
    const { rowCount } = await query('DELETE FROM news WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Новость не найдена' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

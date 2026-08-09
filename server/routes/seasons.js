import { Router } from 'express'
import { query } from '../db.js'
import { isAdminRequest, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { published, show_on_home } = req.query
    let text = 'SELECT * FROM seasons WHERE 1=1'
    if (published === '1' || (!isAdminRequest(req) && published !== '0')) {
      text += ' AND published = true'
    }
    if (show_on_home === '1') text += ' AND show_on_home = true'
    text += ' ORDER BY sort_order ASC, created_at DESC'

    const { rows } = await query(text)
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM seasons WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Сезон не найден' })
    if (!rows[0].published && !isAdminRequest(req)) {
      return res.status(404).json({ error: 'Сезон не найден' })
    }
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, image_url, published, show_on_home } = req.body
  if (!name) return res.status(400).json({ error: 'Название обязательно' })

  try {
    const { rows } = await query(
      `INSERT INTO seasons (name, description, image_url, published, show_on_home)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, description || '', image_url || '', !!published, !!show_on_home],
    )
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM seasons WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Сезон не найден' })

    const e = existing[0]
    const { name, description, image_url, published, show_on_home } = req.body

    const { rows } = await query(
      `UPDATE seasons
       SET name = $1, description = $2, image_url = $3, published = $4, show_on_home = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name ?? e.name,
        description ?? e.description,
        image_url ?? e.image_url,
        published !== undefined ? published : e.published,
        show_on_home !== undefined ? !!show_on_home : e.show_on_home,
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
    const { rowCount } = await query('DELETE FROM seasons WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Сезон не найден' })
    res.json({ success: true })
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Нельзя удалить сезон с коллекциями' })
    }
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

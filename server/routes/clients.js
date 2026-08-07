import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { upsertClient } from '../lib/clients.js'

const router = Router()

const CLIENT_SELECT = `
  SELECT c.*,
    COUNT(o.id)::int AS orders_count,
    COALESCE(SUM(o.total), 0)::float AS total_spent,
    MAX(o.created_at) AS last_order_at
  FROM clients c
  LEFT JOIN orders o ON o.client_id = c.id
`

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q } = req.query
    const params = []
    let where = ''

    if (q) {
      params.push(`%${q.trim()}%`)
      where = `WHERE (
        c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1 OR c.company ILIKE $1 OR c.notes ILIKE $1
      )`
    }

    const { rows } = await query(
      `${CLIENT_SELECT}
       ${where}
       GROUP BY c.id
       ORDER BY COALESCE(MAX(o.created_at), c.updated_at) DESC`,
      params,
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query(
      `${CLIENT_SELECT}
       WHERE c.id = $1
       GROUP BY c.id`,
      [req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Клиент не найден' })
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, email, phone, company, notes } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Имя обязательно' })

  try {
    const client = await upsertClient({ name, email, phone, company, notes, source: 'manual' })
    const { rows } = await query(
      `${CLIENT_SELECT} WHERE c.id = $1 GROUP BY c.id`,
      [client.id],
    )
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(400).json({ error: err.message || 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM clients WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Клиент не найден' })

    const e = existing[0]
    const { name, email, phone, company, notes } = req.body

    const { rows } = await query(
      `UPDATE clients
       SET name = $1, email = $2, phone = $3, company = $4, notes = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        name ?? e.name,
        (email ?? e.email).trim().toLowerCase(),
        phone ?? e.phone,
        company ?? e.company,
        notes ?? e.notes,
        req.params.id,
      ],
    )

    const { rows: full } = await query(
      `${CLIENT_SELECT} WHERE c.id = $1 GROUP BY c.id`,
      [rows[0].id],
    )
    res.json(full[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await query('UPDATE orders SET client_id = NULL WHERE client_id = $1', [req.params.id])
    const { rowCount } = await query('DELETE FROM clients WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Клиент не найден' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'
import { upsertClient } from '../lib/clients.js'

const router = Router()
const STATUSES = ['new', 'processing', 'shipped', 'completed', 'cancelled']

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC')
    res.json(rows.map(parseOrder))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Заказ не найден' })
    res.json(parseOrder(rows[0]))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { customer_name, customer_email, customer_phone, items, status, total, notes } = req.body
  if (!customer_name) return res.status(400).json({ error: 'Имя клиента обязательно' })

  try {
    const client = await upsertClient({
      name: customer_name,
      email: customer_email,
      phone: customer_phone,
      source: 'order',
    })

    const { rows } = await query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, items, status, total, notes, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        customer_name,
        customer_email || '',
        customer_phone || '',
        JSON.stringify(items || []),
        status && STATUSES.includes(status) ? status : 'new',
        total ?? 0,
        notes || '',
        client.id,
      ],
    )
    res.status(201).json(parseOrder(rows[0]))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  const { customer_name, customer_email, customer_phone, items, status, total, notes } = req.body

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' })
  }

  try {
    const { rows: existing } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Заказ не найден' })

    const e = existing[0]
    const nextName = customer_name ?? e.customer_name
    const nextEmail = customer_email ?? e.customer_email
    const nextPhone = customer_phone ?? e.customer_phone

    const client = await upsertClient({
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      source: 'order',
    })

    const { rows } = await query(
      `UPDATE orders
       SET customer_name = $1, customer_email = $2, customer_phone = $3, items = $4,
           status = $5, total = $6, notes = $7, client_id = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        nextName,
        nextEmail,
        nextPhone,
        items ? JSON.stringify(items) : e.items,
        status ?? e.status,
        total ?? e.total,
        notes ?? e.notes,
        client.id,
        req.params.id,
      ],
    )
    res.json(parseOrder(rows[0]))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM orders WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Заказ не найден' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

function parseOrder(order) {
  const items = typeof order.items === 'string'
    ? JSON.parse(order.items || '[]')
    : (order.items || [])
  return { ...order, items }
}

export { STATUSES }
export default router

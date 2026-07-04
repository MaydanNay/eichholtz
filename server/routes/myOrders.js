import { Router } from 'express'
import { query } from '../db.js'
import { requireCustomer } from '../middleware/auth.js'

const router = Router()

function parseOrder(order) {
  let items = order.items || []
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items || '[]')
    } catch {
      items = []
    }
  }
  return { ...order, items }
}

router.get('/', requireCustomer, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, customer_name, customer_email, customer_phone, items, status, total, notes, created_at, updated_at
       FROM orders
       WHERE user_id = $1
          OR (user_id IS NULL AND LOWER(TRIM(customer_email)) = LOWER(TRIM($2)))
       ORDER BY created_at DESC`,
      [req.user.id, req.user.email || ''],
    )
    res.json(rows.map(parseOrder))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

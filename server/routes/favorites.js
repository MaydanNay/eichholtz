import { Router } from 'express'
import { query } from '../db.js'
import { requireCustomer } from '../middleware/auth.js'

const router = Router()

const PRODUCT_SELECT = `
  SELECT p.*, c.name AS collection_name
  FROM favorites f
  JOIN products p ON p.id = f.product_id
  LEFT JOIN collections c ON c.id = p.collection_id
`

router.get('/', requireCustomer, async (req, res) => {
  try {
    const { rows } = await query(
      `${PRODUCT_SELECT} WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
      [req.user.id],
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireCustomer, async (req, res) => {
  const productId = Number(req.body.product_id)
  if (!productId) {
    return res.status(400).json({ error: 'Укажите товар' })
  }

  try {
    const { rows: products } = await query(
      'SELECT id FROM products WHERE id = $1 AND published = true',
      [productId],
    )
    if (!products[0]) {
      return res.status(404).json({ error: 'Товар не найден' })
    }

    await query(
      `INSERT INTO favorites (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [req.user.id, productId],
    )

    const { rows } = await query(`${PRODUCT_SELECT} WHERE f.user_id = $1 AND f.product_id = $2`, [
      req.user.id,
      productId,
    ])
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:productId', requireCustomer, async (req, res) => {
  const productId = Number(req.params.productId)
  if (!productId) {
    return res.status(400).json({ error: 'Некорректный товар' })
  }

  try {
    const { rowCount } = await query(
      'DELETE FROM favorites WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId],
    )
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Товар не в избранном' })
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

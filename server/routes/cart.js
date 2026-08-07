import { Router } from 'express'
import { query } from '../db.js'
import { requireCustomer } from '../middleware/auth.js'

const router = Router()

const CART_SELECT = `
  SELECT p.*, c.name AS collection_name, ci.quantity
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  LEFT JOIN collections c ON c.id = p.collection_id
`

router.get('/', requireCustomer, async (req, res) => {
  try {
    const { rows } = await query(
      `${CART_SELECT} WHERE ci.user_id = $1 ORDER BY ci.updated_at DESC`,
      [req.user.id],
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireCustomer, async (req, res) => {
  const productId = Number(req.body.product_id)
  const quantity = Math.max(1, Math.min(99, Number(req.body.quantity) || 1))

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
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET
         quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99),
         updated_at = NOW()`,
      [req.user.id, productId, quantity],
    )

    const { rows } = await query(`${CART_SELECT} WHERE ci.user_id = $1 AND ci.product_id = $2`, [
      req.user.id,
      productId,
    ])
    res.status(201).json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:productId', requireCustomer, async (req, res) => {
  const productId = Number(req.params.productId)
  const quantity = Number(req.body.quantity)

  if (!productId) {
    return res.status(400).json({ error: 'Некорректный товар' })
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return res.status(400).json({ error: 'Количество должно быть от 1 до 99' })
  }

  try {
    const { rows } = await query(
      `UPDATE cart_items
       SET quantity = $3, updated_at = NOW()
       WHERE user_id = $1 AND product_id = $2
       RETURNING product_id`,
      [req.user.id, productId, quantity],
    )
    if (!rows[0]) {
      return res.status(404).json({ error: 'Товар не в корзине' })
    }

    const { rows: item } = await query(`${CART_SELECT} WHERE ci.user_id = $1 AND ci.product_id = $2`, [
      req.user.id,
      productId,
    ])
    res.json(item[0])
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
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [req.user.id, productId],
    )
    if (rowCount === 0) {
      return res.status(404).json({ error: 'Товар не в корзине' })
    }
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

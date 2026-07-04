import { Router } from 'express'
import { query } from '../db.js'
import { optionalCustomer } from '../middleware/auth.js'
import { upsertClient } from '../lib/clients.js'

const router = Router()

router.post('/', optionalCustomer, async (req, res) => {
  const { name, email, phone, product_name, message, items, total } = req.body

  if (!name?.trim()) return res.status(400).json({ error: 'Пожалуйста, заполните имя' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
    return res.status(400).json({ error: 'Пожалуйста, введите e-mail адрес' })
  }

  const trimmedMessage = message?.trim()
  const phoneDigits = (phone || '').replace(/\D/g, '')
  if (!trimmedMessage && phoneDigits.length < 10) {
    return res.status(400).json({ error: 'Пожалуйста, введите корректный номер телефона' })
  }

  const normalizedItems = Array.isArray(items)
    ? items
      .filter((item) => item?.name)
      .map((item) => ({
        id: item.id || null,
        name: String(item.name).trim(),
        qty: Math.max(1, Number(item.qty || item.quantity) || 1),
        price: Number(item.price) || 0,
        image_url: item.image_url || '',
        collection_name: item.collection_name || item.category || '',
      }))
    : []

  const orderItems = normalizedItems.length > 0
    ? normalizedItems
    : (product_name ? [{ name: String(product_name).trim(), qty: 1, price: 0 }] : [])

  let orderTotal = Number(total)
  if (!orderTotal && orderItems.length) {
    orderTotal = orderItems.reduce(
      (sum, item) => sum + (item.price > 0 ? item.price * item.qty : 0),
      0,
    )
  }

  const isCartOrder = normalizedItems.length > 0
  const source = isCartOrder ? 'cart' : 'inquiry'

  let notes = trimmedMessage || ''
  if (!notes) {
    if (isCartOrder) notes = 'Заявка из корзины'
    else if (product_name) notes = `Заявка на цену: ${product_name}`
    else notes = 'Заявка с сайта'
  }

  try {
    const client = await upsertClient({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      source,
    })

    const { rows } = await query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, items, status, total, notes, client_id, user_id)
       VALUES ($1, $2, $3, $4, 'new', $5, $6, $7, $8)
       RETURNING id`,
      [
        client.name,
        client.email,
        client.phone,
        JSON.stringify(orderItems),
        orderTotal || 0,
        notes,
        client.id,
        req.user?.id || null,
      ],
    )

    res.status(201).json({ success: true, orderId: rows[0].id })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

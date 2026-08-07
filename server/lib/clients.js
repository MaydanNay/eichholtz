import { query } from '../db.js'

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase()
}

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, '')
}

export async function findClient({ email, phone }) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedPhone = normalizePhone(phone)

  if (normalizedEmail) {
    const { rows } = await query(
      'SELECT * FROM clients WHERE LOWER(email) = $1 LIMIT 1',
      [normalizedEmail],
    )
    if (rows[0]) return rows[0]
  }

  if (normalizedPhone) {
    const { rows } = await query(
      `SELECT * FROM clients
       WHERE regexp_replace(phone, '\\D', '', 'g') = $1
       LIMIT 1`,
      [normalizedPhone],
    )
    if (rows[0]) return rows[0]
  }

  return null
}

export async function upsertClient({ name, email, phone, company, notes, source = 'manual' }) {
  const trimmedName = (name || '').trim()
  if (!trimmedName) throw new Error('Имя клиента обязательно')

  const existing = await findClient({ email, phone })
  const normalizedEmail = normalizeEmail(email)
  const trimmedPhone = (phone || '').trim()
  const trimmedCompany = (company || '').trim()
  const trimmedNotes = (notes || '').trim()

  if (existing) {
    const { rows } = await query(
      `UPDATE clients
       SET name = $1,
           email = CASE WHEN $2 <> '' THEN $2 ELSE email END,
           phone = CASE WHEN $3 <> '' THEN $3 ELSE phone END,
           company = CASE WHEN $4 <> '' THEN $4 ELSE company END,
           notes = CASE WHEN $5 <> '' THEN $5 ELSE notes END,
           source = CASE WHEN source = 'manual' THEN $6 ELSE source END,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [trimmedName, normalizedEmail, trimmedPhone, trimmedCompany, trimmedNotes, source, existing.id],
    )
    return rows[0]
  }

  const { rows } = await query(
    `INSERT INTO clients (name, email, phone, company, notes, source)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [trimmedName, normalizedEmail, trimmedPhone, trimmedCompany, trimmedNotes, source],
  )
  return rows[0]
}

export async function backfillClientsFromOrders() {
  await query(`
    INSERT INTO clients (name, email, phone, source, created_at, updated_at)
    SELECT
      o.customer_name,
      o.email_norm,
      o.phone_norm,
      'order',
      o.first_order,
      o.last_order
    FROM (
      SELECT
        customer_name,
        LOWER(TRIM(customer_email)) AS email_norm,
        TRIM(customer_phone) AS phone_norm,
        MIN(created_at) AS first_order,
        MAX(updated_at) AS last_order
      FROM orders
      WHERE customer_name <> ''
      GROUP BY customer_name, LOWER(TRIM(customer_email)), TRIM(customer_phone)
    ) o
    WHERE NOT EXISTS (
      SELECT 1 FROM clients c
      WHERE (o.email_norm <> '' AND LOWER(c.email) = o.email_norm)
         OR (
           o.phone_norm <> ''
           AND regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace(o.phone_norm, '\\D', '', 'g')
         )
    )
  `)

  await query(`
    UPDATE orders o
    SET client_id = c.id
    FROM clients c
    WHERE o.client_id IS NULL
      AND (
        (TRIM(o.customer_email) <> '' AND LOWER(c.email) = LOWER(TRIM(o.customer_email)))
        OR (
          TRIM(o.customer_phone) <> ''
          AND regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace(o.customer_phone, '\\D', '', 'g')
        )
      )
  `)
}

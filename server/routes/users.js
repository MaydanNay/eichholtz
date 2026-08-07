import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAdmin, async (req, res) => {
  try {
    const { q } = req.query
    const params = []
    let sql = 'SELECT id, name, email, phone, created_at FROM users'

    const search = String(q || '').trim().replace(/[%_]/g, '')
    if (search) {
      params.push(`%${search}%`)
      sql += ` WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`
    }

    sql += ' ORDER BY created_at DESC'

    const { rows } = await query(sql, params)
    res.json(rows)
  } catch (err) {
    console.error('Error fetching users:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM users WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('Error deleting user:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

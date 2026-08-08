import { Router } from 'express'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/collections', requireAdmin, async (req, res) => {
  const { collections } = req.body // Array of { id, hero_order, show_on_home }
  
  if (!Array.isArray(collections)) {
    return res.status(400).json({ error: 'Неверный формат данных' })
  }

  try {
    // Reset hero_order and show_on_home for all collections
    await query('UPDATE collections SET hero_order = NULL, show_on_home = false')

    for (const c of collections) {
      if (c.hero_order !== undefined && c.hero_order !== null) {
        await query(
          'UPDATE collections SET hero_order = $1 WHERE id = $2',
          [c.hero_order, c.id]
        )
      }
      if (c.sort_order !== undefined) {
        await query(
          'UPDATE collections SET sort_order = $1 WHERE id = $2',
          [c.sort_order, c.id]
        )
      }
      if (c.show_on_home === true) {
        await query(
          'UPDATE collections SET show_on_home = true WHERE id = $1',
          [c.id]
        )
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/seasons', requireAdmin, async (req, res) => {
  const { seasons } = req.body // Array of { id, show_on_home, sort_order }
  
  if (!Array.isArray(seasons)) {
    return res.status(400).json({ error: 'Неверный формат данных' })
  }

  try {
    await query('UPDATE seasons SET show_on_home = false')

    for (const s of seasons) {
      if (s.show_on_home === true) {
        await query(
          'UPDATE seasons SET show_on_home = true WHERE id = $1',
          [s.id]
        )
      }
      if (s.sort_order !== undefined) {
        await query(
          'UPDATE seasons SET sort_order = $1 WHERE id = $2',
          [s.sort_order, s.id]
        )
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/settings', async (req, res) => {
  try {
    const { rows } = await query('SELECT key, value FROM settings')
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {})
    res.json(settings)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/settings', requireAdmin, async (req, res) => {
  const { settings } = req.body
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Неверный формат данных' })
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      let stored
      if (typeof value === 'string') {
        stored = value
      } else if (value == null) {
        stored = ''
      } else {
        stored = JSON.stringify(value)
      }
      // Guard against accidental Object stringification
      if (stored.includes('[object Object]')) {
        return res.status(400).json({ error: `Некорректное значение настройки: ${key}` })
      }
      await query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, stored]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

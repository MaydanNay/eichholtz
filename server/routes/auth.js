import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { getPasswordLengthError, hashPassword, MAX_PASSWORD_LENGTH, verifyPassword } from '../lib/password.js'
import { authLoginLimiter, authMeLimiter, authRegisterLimiter } from '../middleware/authRateLimit.js'

const router = Router()

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' })
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

router.post('/register', authRegisterLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim()
  const password = String(req.body.password || '')
  const phoneRaw = String(req.body.phone || '').trim()
  const phone = normalizePhone(phoneRaw)

  if (!name) {
    return res.status(400).json({ error: 'Введите имя' })
  }

  if (!phone || phone.length < 10) {
    return res.status(400).json({ error: 'Введите корректный телефон' })
  }

  const passwordError = getPasswordLengthError(password)
  if (passwordError) {
    return res.status(400).json({ error: passwordError })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Сервер не настроен' })
  }

  try {
    const existing = await query(
      `SELECT id FROM users
       WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1`,
      [phone],
    )
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'Пользователь с таким телефоном уже существует' })
    }

    const passwordHash = await hashPassword(password)
    const { rows } = await query(
      `INSERT INTO users (name, email, phone, password_hash)
       VALUES ($1, NULL, $2, $3)
       RETURNING id, name, email, phone, created_at`,
      [name, phoneRaw, passwordHash],
    )

    const user = rows[0]
    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'customer',
    })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'customer',
      },
    })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Пользователь с таким телефоном уже существует' })
    }
    if (err.message === 'PASSWORD_TOO_LONG') {
      return res.status(400).json({ error: 'Пароль слишком длинный' })
    }
    console.error('register error', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/login', authLoginLimiter, async (req, res) => {
  const login = String(req.body.email || req.body.login || '').trim()
  const password = String(req.body.password || '')
  const email = normalizeEmail(login)
  const phone = normalizePhone(login)

  if (!login || !password) {
    return res.status(400).json({ error: 'Введите телефон/email и пароль' })
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: 'Пароль слишком длинный' })
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Сервер не настроен' })
  }

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (email && email === adminEmail && password === adminPassword) {
    const token = signToken({ email, role: 'admin' })
    return res.json({
      token,
      user: { email, role: 'admin' },
    })
  }

  try {
    let rows = []
    if (email.includes('@')) {
      const result = await query(
        'SELECT id, name, email, phone, password_hash FROM users WHERE email = $1',
        [email],
      )
      rows = result.rows
    } else if (phone) {
      const result = await query(
        `SELECT id, name, email, phone, password_hash FROM users
         WHERE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') = $1`,
        [phone],
      )
      rows = result.rows
    }

    const user = rows[0]

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Неверный телефон/email или пароль' })
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'customer',
    })

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'customer',
      },
    })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/me', authMeLimiter, async (req, res) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Не авторизован' })
  }

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)

    if (payload.role === 'admin') {
      return res.json({ email: payload.email, role: 'admin' })
    }

    if (payload.role === 'customer' && payload.id) {
      const { rows } = await query(
        'SELECT id, name, email, phone FROM users WHERE id = $1',
        [payload.id],
      )
      const user = rows[0]
      if (!user) {
        return res.status(401).json({ error: 'Пользователь не найден' })
      }

      return res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'customer',
      })
    }

    return res.status(401).json({ error: 'Недействительный токен' })
  } catch {
    res.status(401).json({ error: 'Недействительный токен' })
  }
})

export default router

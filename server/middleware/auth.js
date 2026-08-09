import jwt from 'jsonwebtoken'

export function isAdminRequest(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return false

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }

  try {
    const token = header.slice(7)
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' })
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' })
    }
    next()
  })
}

export function requireCustomer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'customer' || !req.user?.id) {
      return res.status(403).json({ error: 'Требуется авторизация' })
    }
    next()
  })
}

export function optionalCustomer(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next()
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (payload.role === 'customer' && payload.id) {
      req.user = payload
    }
  } catch {
    // ignore invalid optional token
  }

  next()
}

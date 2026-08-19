import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

const rateLimitMessage = { error: 'Слишком много попыток. Попробуйте позже.' }

export const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
})

export const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
})

export const authMeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
})

/** 5 заявок на пользователя (или IP) за 15 минут */
export const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много заявок. Попробуйте через 15 минут.' },
  keyGenerator: (req) => {
    if (req.user?.id) return `inquiry:user:${req.user.id}`
    return `inquiry:ip:${ipKeyGenerator(req.ip)}`
  },
})

/** 10 PDF-каталогов с одного IP за 15 минут */
export const catalogPdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов на каталог. Попробуйте через 15 минут.' },
})

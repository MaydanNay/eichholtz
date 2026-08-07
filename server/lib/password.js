import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128

export function getPasswordLengthError(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return 'Пароль слишком длинный'
  }
  return null
}

export async function hashPassword(password) {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('PASSWORD_TOO_LONG')
  }
  const salt = randomBytes(16).toString('hex')
  const derived = await scryptAsync(password, salt, 64)
  return `${salt}:${derived.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false

  const derived = await scryptAsync(password, salt, 64)
  const hashBuf = Buffer.from(hash, 'hex')

  if (hashBuf.length !== derived.length) return false
  return timingSafeEqual(derived, hashBuf)
}

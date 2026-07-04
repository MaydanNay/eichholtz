import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { requireAdmin } from '../middleware/auth.js'
import { detectImageType } from '../utils/imageMagic.js'
import { isUploadedImageInUse } from '../utils/imageUsage.js'
import {
  getCategoryRoot,
  parseUploadedImageUrl,
  resolveUploadedImagePath,
  UPLOAD_CATEGORIES,
} from '../utils/uploadedImages.js'

const router = Router()

const MAX_FILE_SIZE = 5 * 1024 * 1024

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Разрешены только JPEG, PNG, WebP и GIF'))
  },
})

router.post('/', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Файл слишком большой (макс. 5 МБ)' })
      }
      return res.status(400).json({ error: err.message || 'Ошибка загрузки' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не выбран' })
    }

    const category = UPLOAD_CATEGORIES.has(req.body?.category)
      ? req.body.category
      : 'products'

    const detected = detectImageType(req.file.buffer)
    if (!detected) {
      return res.status(400).json({ error: 'Файл не является допустимым изображением' })
    }

    if (!ALLOWED_MIME.has(detected.mime)) {
      return res.status(400).json({ error: 'Формат изображения не поддерживается' })
    }

    try {
      const categoryRoot = getCategoryRoot(category)
      fs.mkdirSync(categoryRoot, { recursive: true })

      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${detected.ext}`
      const filePath = path.join(categoryRoot, filename)
      await fs.promises.writeFile(filePath, req.file.buffer)

      res.status(201).json({ url: `/images/${category}/${filename}` })
    } catch {
      res.status(500).json({ error: 'Ошибка сохранения файла' })
    }
  })
})

router.delete('/', requireAdmin, async (req, res) => {
  const { url, except, except_product_id: legacyExceptProductId } = req.body || {}
  const parsed = parseUploadedImageUrl(url)

  if (!parsed) {
    return res.status(400).json({ error: 'Недопустимый URL изображения' })
  }

  const filePath = resolveUploadedImagePath(parsed.category, parsed.filename)
  if (!filePath) {
    return res.status(400).json({ error: 'Недопустимый путь' })
  }

  const exceptEntity = except || (legacyExceptProductId
    ? { type: 'product', id: legacyExceptProductId }
    : null)

  try {
    if (await isUploadedImageInUse(url, exceptEntity)) {
      return res.status(409).json({ error: 'Изображение используется на сайте' })
    }

    await fs.promises.unlink(filePath).catch((unlinkErr) => {
      if (unlinkErr.code !== 'ENOENT') throw unlinkErr
    })

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка удаления файла' })
  }
})

export default router

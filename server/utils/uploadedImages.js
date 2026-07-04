import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const UPLOAD_CATEGORIES = new Set(['products', 'news', 'seasons', 'collections', 'categories'])
export const imagesBaseRoot = path.join(__dirname, '../../public/images')

export function getCategoryRoot(category) {
  if (!UPLOAD_CATEGORIES.has(category)) return null
  return path.join(imagesBaseRoot, category)
}

export function parseUploadedImageUrl(url) {
  if (!url || typeof url !== 'string') return null

  const match = url.match(/^\/images\/(products|news|seasons|collections|categories)\/([a-zA-Z0-9._-]+)$/)
  if (!match) return null

  return { category: match[1], filename: match[2] }
}

export function resolveUploadedImagePath(category, filename) {
  const categoryRoot = getCategoryRoot(category)
  if (!categoryRoot) return null

  const filePath = path.join(categoryRoot, filename)
  const resolved = path.resolve(filePath)
  const root = path.resolve(categoryRoot)

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null
  }

  return resolved
}

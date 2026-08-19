import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { throwIfAborted } from './pdfGenerationError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = process.env.CATALOG_PDF_CACHE_DIR
  || path.join(__dirname, '../cache/catalog-pdf')
export const CATALOG_PDF_CACHE_TTL_MS = Number(process.env.CATALOG_PDF_CACHE_TTL_MS) || 3_600_000

const inflight = new Map()

function cachePath(categoryId) {
  return path.join(CACHE_DIR, `category-${categoryId}.pdf`)
}

export async function readCachedCatalogPdf(categoryId) {
  try {
    const filePath = cachePath(categoryId)
    const stat = await fs.stat(filePath)
    if (Date.now() - stat.mtimeMs > CATALOG_PDF_CACHE_TTL_MS) {
      await fs.unlink(filePath).catch(() => {})
      return null
    }
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

export async function writeCachedCatalogPdf(categoryId, buffer) {
  await fs.mkdir(CACHE_DIR, { recursive: true })
  const filePath = cachePath(categoryId)
  const tmpPath = `${filePath}.${process.pid}.tmp`
  await fs.writeFile(tmpPath, buffer)
  await fs.rename(tmpPath, filePath)
}

export async function getCatalogPdf(category, generateFn, signal) {
  const cached = await readCachedCatalogPdf(category.id)
  if (cached) {
    return { buffer: cached, fromCache: true }
  }

  throwIfAborted(signal)

  if (inflight.has(category.id)) {
    return inflight.get(category.id)
  }

  const task = (async () => {
    try {
      throwIfAborted(signal)
      const buffer = await generateFn(category, { signal })
      throwIfAborted(signal)
      await writeCachedCatalogPdf(category.id, buffer)
      return { buffer, fromCache: false }
    } finally {
      inflight.delete(category.id)
    }
  })()

  inflight.set(category.id, task)
  return task
}

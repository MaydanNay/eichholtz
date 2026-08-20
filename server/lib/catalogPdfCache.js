import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from '../db.js'
import { throwIfAborted } from './pdfGenerationError.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = process.env.CATALOG_PDF_CACHE_DIR
  || path.join(__dirname, '../cache/catalog-pdf')
export const CATALOG_PDF_CACHE_TTL_MS = Number(process.env.CATALOG_PDF_CACHE_TTL_MS) || 3_600_000

const inflight = new Map()
const generationEpoch = new Map()

function currentGenerationEpoch(categoryId) {
  return generationEpoch.get(categoryId) || 0
}

function bumpGenerationEpoch(categoryId) {
  const next = currentGenerationEpoch(categoryId) + 1
  generationEpoch.set(categoryId, next)
  return next
}

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
    const startedEpoch = currentGenerationEpoch(category.id)
    try {
      throwIfAborted(signal)
      const buffer = await generateFn(category, { signal })
      throwIfAborted(signal)
      if (currentGenerationEpoch(category.id) === startedEpoch) {
        await writeCachedCatalogPdf(category.id, buffer)
      }
      return { buffer, fromCache: false }
    } finally {
      inflight.delete(category.id)
    }
  })()

  inflight.set(category.id, task)
  return task
}

export function parseExtraCategoryIds(specs) {
  let obj = specs
  if (typeof specs === 'string') {
    try {
      obj = JSON.parse(specs)
    } catch {
      return []
    }
  }
  if (!obj || typeof obj !== 'object') return []
  const extra = obj.extra_categories
  if (!Array.isArray(extra)) return []
  return [...new Set(extra.map((id) => Number(id)).filter(Number.isFinite))]
}

async function fetchCategoryAncestorIds(categoryId) {
  if (!categoryId) return []
  const ids = []
  let currentId = categoryId
  for (let depth = 0; depth < 16 && currentId; depth += 1) {
    ids.push(currentId)
    const { rows } = await query('SELECT parent_id FROM categories WHERE id = $1', [currentId])
    currentId = rows[0]?.parent_id ?? null
  }
  return ids
}

async function fetchCategoryDescendantIds(categoryId) {
  if (!categoryId) return []
  const { rows } = await query(
    `WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id = $1
      UNION ALL
      SELECT c.id FROM categories c
      INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT id FROM cat_tree`,
    [categoryId],
  )
  return rows.map((row) => row.id)
}

export async function invalidateCatalogPdfCache(categoryId) {
  if (!categoryId) return
  bumpGenerationEpoch(categoryId)
  inflight.delete(categoryId)
  await fs.unlink(cachePath(categoryId)).catch(() => {})
}

export async function invalidateCatalogPdfCacheMany(categoryIds) {
  const unique = [...new Set(categoryIds.filter(Boolean))]
  await Promise.all(unique.map((id) => invalidateCatalogPdfCache(id)))
}

export async function invalidateCatalogPdfForProductChange({
  categoryId,
  previousCategoryId = null,
  extraCategoryIds = [],
  previousExtraCategoryIds = [],
}) {
  const ids = new Set()
  for (const startId of [
    categoryId,
    previousCategoryId,
    ...extraCategoryIds,
    ...previousExtraCategoryIds,
  ]) {
    for (const id of await fetchCategoryAncestorIds(startId)) {
      ids.add(id)
    }
  }
  await invalidateCatalogPdfCacheMany([...ids])
}

export async function invalidateCatalogPdfForCategoryChange(categoryId, {
  previousParentId = null,
} = {}) {
  const ids = new Set()
  for (const id of await fetchCategoryDescendantIds(categoryId)) {
    ids.add(id)
  }
  for (const id of await fetchCategoryAncestorIds(categoryId)) {
    ids.add(id)
  }
  if (previousParentId != null) {
    for (const id of await fetchCategoryAncestorIds(previousParentId)) {
      ids.add(id)
    }
  }
  await invalidateCatalogPdfCacheMany([...ids])
}

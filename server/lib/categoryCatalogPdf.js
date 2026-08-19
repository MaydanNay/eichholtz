import PDFDocument from 'pdfkit'
import sharp from 'sharp'
import { createRequire } from 'module'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from '../db.js'
import {
  buildNewestOrderSql,
  resolveAlgoliaPathForCategoryFilter,
} from './productSort.js'
import { PdfGenerationAbortedError, throwIfAborted } from './pdfGenerationError.js'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_IMAGES = path.join(__dirname, '../../public/images')
const FONT_SANS_REGULAR = require.resolve('@expo-google-fonts/jost/400Regular/Jost_400Regular.ttf')
const FONT_SANS_MEDIUM = require.resolve('@expo-google-fonts/jost/500Medium/Jost_500Medium.ttf')
const FONT_SERIF_SEMIBOLD = require.resolve('@expo-google-fonts/cormorant/600SemiBold/Cormorant_600SemiBold.ttf')

const MAX_PRODUCTS = 500
const PAGE_MARGIN = 48
const PAGE_HEADER_HEIGHT = 28
const PAGE_FOOTER_HEIGHT = 18
const PAGE_FOOTER_GAP = 6
const COLS = 2
const ROWS = 3
const PRODUCTS_PER_PAGE = COLS * ROWS
const IMAGE_BATCH_SIZE = 15
export const PDF_GENERATION_TIMEOUT_MS = 120_000

function linkAbortSignal(parentSignal, childController) {
  if (!parentSignal) return () => {}
  if (parentSignal.aborted) {
    childController.abort(parentSignal.reason)
    return () => {}
  }
  const onAbort = () => childController.abort(parentSignal.reason)
  parentSignal.addEventListener('abort', onAbort, { once: true })
  return () => parentSignal.removeEventListener('abort', onAbort)
}

const PDF_IMAGE_PRESETS = {
  product: { maxWidth: 192, maxHeight: 192, quality: 84 },
  cover: { maxWidth: 1240, maxHeight: 1754, quality: 85 },
}

async function optimizeImageForPdf(buffer, preset) {
  if (!buffer?.length) return null
  try {
    return await sharp(buffer)
      .rotate()
      .resize(preset.maxWidth, preset.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: preset.quality, mozjpeg: true })
      .toBuffer()
  } catch {
    return null
  }
}

async function fetchOptimizedImage(url, preset, signal) {
  throwIfAborted(signal)
  const raw = await fetchImageBuffer(url, signal)
  if (!raw) return null
  throwIfAborted(signal)
  return optimizeImageForPdf(raw, preset)
}

function safeFilename(name) {
  return String(name || 'catalog')
    .trim()
    .replace(/[^\w\u0400-\u04FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'catalog'
}

function parseSpecs(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function formatPrice(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return 'Цена по запросу'
  return `${amount.toLocaleString('ru-RU')} ₸`
}

function specText(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ')
  }
  return String(value).trim()
}

function compactDimensions(value) {
  const text = specText(value)
  if (!text) return ''
  const oneLine = text.replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim()
  if (oneLine.length <= 58) return oneLine
  return `${oneLine.slice(0, 55)}…`
}

function buildProductSpecLines(specs) {
  const lines = []
  const traits = [
    specText(specs.material),
    specText(specs.color),
    specText(specs.finish),
    specText(specs.fabric),
  ].filter(Boolean)

  if (traits.length > 0) {
    lines.push(traits.slice(0, 2).join(' · '))
  }

  const dimensions = compactDimensions(specs.dimensions)
  if (dimensions) lines.push(dimensions)

  return lines.slice(0, 2)
}

async function fetchCategoryTreeIds(categoryId) {
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
  return rows.map((r) => r.id)
}

async function fetchRootCategory(category) {
  let current = category
  for (let depth = 0; depth < 12 && current?.parent_id; depth += 1) {
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [current.parent_id])
    if (!rows[0]) break
    current = rows[0]
  }
  return current
}

async function fetchRootCategoryName(category) {
  const root = await fetchRootCategory(category)
  return root?.name || ''
}

async function resolveCoverImageUrl(category) {
  const root = await fetchRootCategory(category)
  const rootImage = root?.image_url?.trim()
  if (rootImage) return rootImage

  let current = category
  for (let depth = 0; depth < 12 && current; depth += 1) {
    const image = current.image_url?.trim()
    if (image) return image
    if (!current.parent_id) break
    const { rows } = await query('SELECT * FROM categories WHERE id = $1', [current.parent_id])
    current = rows[0] || null
  }
  return ''
}

function resolveImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (trimmed.startsWith('/')) {
    const siteUrl = (process.env.SITE_URL || 'http://localhost:3001').replace(/\/$/, '')
    return `${siteUrl}${trimmed}`
  }
  return trimmed
}

async function fetchCategoryProducts(categoryId) {
  const treeIds = await fetchCategoryTreeIds(categoryId)
  if (treeIds.length === 0) return []

  const placeholders = treeIds.map((_, i) => `$${i + 1}`).join(', ')
  const treeSql = `WITH RECURSIVE cat_tree AS (
      SELECT id FROM categories WHERE id IN (${placeholders})
      UNION ALL
      SELECT c.id FROM categories c
      INNER JOIN cat_tree ct ON c.parent_id = ct.id
    )
    SELECT id FROM cat_tree`

  const params = [...treeIds]
  const promotedPath = await resolveAlgoliaPathForCategoryFilter(String(categoryId), query)
  const orderSql = buildNewestOrderSql(params, promotedPath)
  params.push(MAX_PRODUCTS + 1)

  const { rows } = await query(
    `SELECT p.id, p.name, p.price, p.image_url, p.images, p.specs
     FROM products p
     WHERE p.published = true
       AND (
         p.category_id IN (${treeSql})
         OR EXISTS (
           SELECT 1 FROM (${treeSql}) tree_ids
           WHERE p.specs->'extra_categories' @> to_jsonb(tree_ids.id)
         )
       )
     ORDER BY ${orderSql}
     LIMIT $${params.length}`,
    params,
  )

  return rows
}

async function fetchImageBuffer(url, signal) {
  if (!url || typeof url !== 'string') return null
  throwIfAborted(signal)

  if (url.startsWith('/images/')) {
    const localPath = path.join(PUBLIC_IMAGES, url.slice('/images/'.length))
    try {
      const buf = await fs.readFile(localPath)
      if (buf.length > 0 && buf.length <= 6_000_000) return buf
    } catch {
      // fall through to remote fetch
    }
  }

  const resolved = resolveImageUrl(url)
  if (!resolved) return null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    const unlinkAbort = linkAbortSignal(signal, controller)
    const res = await fetch(resolved, { signal: controller.signal })
    clearTimeout(timer)
    unlinkAbort()
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 6_000_000) return null
    return buf
  } catch (err) {
    if (signal?.aborted || err?.name === 'AbortError') {
      throwIfAborted(signal)
    }
    return null
  }
}

function productImageUrl(product) {
  if (product.image_url) return product.image_url
  let images = product.images
  if (typeof images === 'string') {
    try {
      images = JSON.parse(images)
    } catch {
      images = []
    }
  }
  if (Array.isArray(images) && images[0]) return images[0]
  return ''
}

async function preloadProductImages(products, getImage, signal) {
  const buffers = new Array(products.length).fill(null)
  for (let i = 0; i < products.length; i += IMAGE_BATCH_SIZE) {
    throwIfAborted(signal)
    const batch = products.slice(i, i + IMAGE_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (product, offset) => {
        throwIfAborted(signal)
        return {
          index: i + offset,
          buffer: await getImage(product),
        }
      }),
    )
    for (const { index, buffer } of results) {
      buffers[index] = buffer
    }
  }
  return buffers
}

function drawCoverPage(doc, { category, rootName, productCount, truncated, coverImageBuffer }) {
  const { width, height } = doc.page
  let hasCover = false

  if (coverImageBuffer) {
    try {
      doc.image(coverImageBuffer, 0, 0, {
        cover: [width, height],
        align: 'center',
        valign: 'center',
      })
      hasCover = true
    } catch {
      // ignore broken cover image
    }
  }

  if (hasCover) {
    doc.save()
    doc.rect(0, 0, width, height).fillOpacity(0.52).fill('#000000')
    doc.restore()
    doc.fillOpacity(1)
  }

  const colors = hasCover
    ? { brand: '#f0f0f0', title: '#ffffff', muted: '#e0e0e0', line: '#ffffff' }
    : { brand: '#888888', title: '#1a1a1a', muted: '#666666', line: '#d4d4d4' }

  const textWidth = width - PAGE_MARGIN * 2

  doc.font('SansMedium').fontSize(11).fillColor(colors.brand)
  doc.text('EICHHOLTZ KAZAKHSTAN', PAGE_MARGIN, PAGE_MARGIN + 20, {
    width: textWidth,
    align: 'center',
  })

  doc.moveTo(PAGE_MARGIN, PAGE_MARGIN + 52)
    .lineTo(width - PAGE_MARGIN, PAGE_MARGIN + 52)
    .strokeColor(colors.line)
    .lineWidth(1)
    .stroke()

  doc.font('SerifSemiBold').fontSize(28).fillColor(colors.title)
  doc.text(category.name, PAGE_MARGIN, height * 0.36, {
    width: textWidth,
    align: 'center',
  })

  if (rootName && rootName !== category.name) {
    doc.font('SansRegular').fontSize(12).fillColor(colors.muted)
    doc.text(rootName, PAGE_MARGIN, doc.y + 12, {
      width: textWidth,
      align: 'center',
    })
  }

  doc.font('SansRegular').fontSize(11).fillColor(colors.muted)
  const countLabel = truncated
    ? `Товаров в каталоге: ${productCount}+ (показаны первые ${MAX_PRODUCTS})`
    : `Товаров в каталоге: ${productCount}`
  doc.text(countLabel, PAGE_MARGIN, doc.y + 24, {
    width: textWidth,
    align: 'center',
  })

  const dateStr = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  doc.text(dateStr, PAGE_MARGIN, height - PAGE_MARGIN - 30, {
    width: textWidth,
    align: 'center',
  })

  doc.addPage()
}

function drawPageHeader(doc, categoryName) {
  const { width } = doc.page
  doc.font('SansMedium').fontSize(9).fillColor('#999999')
  doc.text(categoryName.toUpperCase(), PAGE_MARGIN, PAGE_MARGIN - 8, {
    width: width - PAGE_MARGIN * 2,
    align: 'left',
  })
  doc.moveTo(PAGE_MARGIN, PAGE_MARGIN + 14)
    .lineTo(width - PAGE_MARGIN, PAGE_MARGIN + 14)
    .strokeColor('#e5e5e5')
    .lineWidth(0.5)
    .stroke()
  return PAGE_MARGIN + PAGE_HEADER_HEIGHT
}

function drawProductCard(doc, product, x, y, cellWidth, cellHeight, imageBuffer) {
  const padding = 8
  const imageSize = 96
  const imageX = x + (cellWidth - imageSize) / 2
  const imageY = y + padding

  if (imageBuffer) {
    try {
      doc.image(imageBuffer, imageX, imageY, {
        fit: [imageSize, imageSize],
        align: 'center',
        valign: 'center',
      })
    } catch {
      doc.rect(imageX, imageY, imageSize, imageSize).strokeColor('#e5e5e5').stroke()
    }
  } else {
    doc.rect(imageX, imageY, imageSize, imageSize).strokeColor('#e5e5e5').stroke()
  }

  const specs = parseSpecs(product.specs)
  const sku = specs.sku ? String(specs.sku) : ''
  const specLines = buildProductSpecLines(specs)

  let textY = imageY + imageSize + 10
  const textWidth = cellWidth - padding * 2
  const textX = x + padding

  doc.font('SansRegular').fontSize(9).fillColor('#1a1a1a')
  doc.text(product.name || '—', textX, textY, {
    width: textWidth,
    height: 24,
    ellipsis: true,
    lineBreak: true,
  })

  textY = doc.y + 4
  if (sku) {
    doc.font('SansRegular').fontSize(8).fillColor('#888888')
    doc.text(`Артикул: ${sku}`, textX, textY, { width: textWidth })
    textY = doc.y + 2
  }

  for (const line of specLines) {
    doc.font('SansRegular').fontSize(8).fillColor('#666666')
    doc.text(line, textX, textY, {
      width: textWidth,
      height: 12,
      ellipsis: true,
      lineBreak: false,
    })
    textY = doc.y + 2
  }

  doc.font('SansMedium').fontSize(9).fillColor('#1a1a1a')
  doc.text(formatPrice(product.price), textX, textY + 2, { width: textWidth })

  doc.rect(x, y, cellWidth, cellHeight).strokeColor('#efefef').lineWidth(0.5).stroke()
}

function drawPageFooter(doc, pageNum) {
  const { width, height } = doc.page
  const footerY = height - PAGE_MARGIN - PAGE_FOOTER_HEIGHT
  doc.font('SansRegular').fontSize(8).fillColor('#aaaaaa')
  doc.text(
    `eichholtz.kz · ${pageNum}`,
    PAGE_MARGIN,
    footerY,
    {
      width: width - PAGE_MARGIN * 2,
      align: 'center',
      lineBreak: false,
      height: PAGE_FOOTER_HEIGHT,
    },
  )
}

export async function generateCategoryCatalogPdf(category, options = {}) {
  const { signal } = options
  if (!category || category.parent_id == null) {
    throw new Error('Root categories cannot generate catalog PDF')
  }
  throwIfAborted(signal)

  const [allProducts, rootName, coverImageUrl] = await Promise.all([
    fetchCategoryProducts(category.id),
    fetchRootCategoryName(category),
    resolveCoverImageUrl(category),
  ])
  throwIfAborted(signal)

  const truncated = allProducts.length > MAX_PRODUCTS
  const products = truncated ? allProducts.slice(0, MAX_PRODUCTS) : allProducts

  const coverImageBuffer = coverImageUrl
    ? await fetchOptimizedImage(coverImageUrl, PDF_IMAGE_PRESETS.cover, signal)
    : null

  const imageCache = new Map()
  async function getImage(product) {
    throwIfAborted(signal)
    const url = productImageUrl(product)
    if (!url) return null
    const cacheKey = `${url}:product`
    if (imageCache.has(cacheKey)) return imageCache.get(cacheKey)
    const buf = await fetchOptimizedImage(url, PDF_IMAGE_PRESETS.product, signal)
    imageCache.set(cacheKey, buf)
    return buf
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const fail = (err) => {
      if (settled) return
      settled = true
      reject(err)
    }
    const succeed = (buffer) => {
      if (settled) return
      settled = true
      resolve(buffer)
    }

    const onAbort = () => {
      fail(new PdfGenerationAbortedError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      autoFirstPage: false,
      info: {
        Title: `${category.name} — Eichholtz`,
        Author: 'Eichholtz Kazakhstan',
      },
    })

    const chunks = []
    const onData = (chunk) => chunks.push(chunk)
    doc.on('data', onData)
    doc.on('end', () => {
      signal?.removeEventListener('abort', onAbort)
      succeed(Buffer.concat(chunks))
    })
    doc.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort)
      fail(err)
    })

    doc.registerFont('SansRegular', FONT_SANS_REGULAR)
    doc.registerFont('SansMedium', FONT_SANS_MEDIUM)
    doc.registerFont('SerifSemiBold', FONT_SERIF_SEMIBOLD)

    doc.addPage()
    drawCoverPage(doc, {
      category,
      rootName,
      productCount: truncated ? allProducts.length : products.length,
      truncated,
      coverImageBuffer,
    })

    let pageNum = 2
    let productIndex = 0

    const contentWidth = doc.page.width - PAGE_MARGIN * 2
    const contentTop = PAGE_MARGIN + PAGE_HEADER_HEIGHT
    const contentBottom = doc.page.height - PAGE_MARGIN - PAGE_FOOTER_HEIGHT - PAGE_FOOTER_GAP
    const contentHeight = contentBottom - contentTop
    const cellWidth = contentWidth / COLS
    const cellHeight = contentHeight / ROWS

    async function renderAll() {
      try {
        throwIfAborted(signal)
        const productImages = products.length > 0
          ? await preloadProductImages(products, getImage, signal)
          : []

        if (products.length === 0) {
          drawPageHeader(doc, category.name)
          doc.font('SansRegular').fontSize(12).fillColor('#666666')
          doc.text('В этой категории пока нет опубликованных товаров.', PAGE_MARGIN, doc.y + 40, {
            width: doc.page.width - PAGE_MARGIN * 2,
            align: 'center',
          })
          drawPageFooter(doc, pageNum)
          doc.end()
          return
        }

        let startY = drawPageHeader(doc, category.name)

        for (let i = 0; i < products.length; i += 1) {
          throwIfAborted(signal)
          const slotOnPage = productIndex % PRODUCTS_PER_PAGE
          if (slotOnPage === 0 && productIndex > 0) {
            drawPageFooter(doc, pageNum)
            doc.addPage()
            pageNum += 1
            startY = drawPageHeader(doc, category.name)
          }

          const col = slotOnPage % COLS
          const row = Math.floor(slotOnPage / COLS)
          const x = PAGE_MARGIN + col * cellWidth
          const y = startY + row * cellHeight

          const imageBuffer = productImages[i]
          drawProductCard(doc, products[i], x, y, cellWidth, cellHeight, imageBuffer)
          productIndex += 1
        }

        drawPageFooter(doc, pageNum)
        doc.end()
      } catch (err) {
        doc.removeListener('data', onData)
        signal?.removeEventListener('abort', onAbort)
        fail(err)
      }
    }

    renderAll()
  })
}

export { safeFilename }

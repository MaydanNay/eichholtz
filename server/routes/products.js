import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

function isAdminRequest(req) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return false

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    return payload.role === 'admin'
  } catch {
    return false
  }
}

function normalizeSpecs(input) {
  if (!input || typeof input !== 'object') return {}
  const specs = {}
  for (const key of Object.keys(input)) {
    const value = String(input[key] || '').trim()
    if (value) specs[key] = value
  }
  return specs
}

function parseImages(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean)
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean)
      }
    } catch {
      return value ? [value] : []
    }
  }

  return []
}

function toHighResImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.replace(/\/cache\/[a-f0-9]+\//gi, '/')
}

function normalizeProduct(row) {
  if (!row) return row

  let images = parseImages(row.images).map(toHighResImageUrl)
  let mainUrl = toHighResImageUrl(row.image_url)

  if (images.length === 0 && mainUrl) {
    images = [mainUrl]
  }

  return {
    ...row,
    images,
    image_url: images[0] || mainUrl || '',
  }
}

function normalizeProductInput(body) {
  const images = parseImages(body.images)
  const fallback = body.image_url ? [String(body.image_url)] : []
  const list = images.length > 0 ? images : fallback

  return {
    images: list,
    image_url: list[0] || '',
  }
}

const PRODUCT_SELECT = `
  SELECT p.*,
         coll.name AS collection_name,
         seas.name AS collection_season_name,
         cat.name AS catalog_name,
         catg.name AS category_name,
         catg.parent_id AS category_parent_id,
         pcatg.name AS category_parent_name
  FROM products p
  LEFT JOIN collections coll ON coll.id = p.collection_id
  LEFT JOIN seasons seas ON seas.id = coll.season_id
  LEFT JOIN collections cat ON cat.id = p.catalog_id
  LEFT JOIN categories catg ON catg.id = p.category_id
  LEFT JOIN categories pcatg ON pcatg.id = catg.parent_id
`

async function resolveCategoryLabel(category, categoryId) {
  if (categoryId) {
    const { rows } = await query('SELECT name FROM categories WHERE id = $1', [categoryId])
    if (rows[0]) return rows[0].name
  }
  return category || ''
}

async function validateCategoryRef(id) {
  const { rows } = await query('SELECT id FROM categories WHERE id = $1', [id])
  return !!rows[0]
}

async function validateCollectionRef(id, kind) {
  const { rows } = await query(
    'SELECT id FROM collections WHERE id = $1 AND kind = $2',
    [id, kind],
  )
  return !!rows[0]
}

router.get('/', async (req, res) => {
  try {
    const { collection_id, catalog_id, category_id, q, limit } = req.query
    const params = []
    const clauses = []
    let text = PRODUCT_SELECT

    if (req.query.published === '1') {
      params.push(true)
      clauses.push(`p.published = $${params.length}`)
    }

    if (collection_id) {
      // Ищем по p.collection_id или p.specs->'extra_collections'
      const { rows: collRows } = await query('SELECT name FROM collections WHERE id = $1', [collection_id])
      const collName = collRows[0]?.name
      if (collName) {
        params.push(Number(collection_id))
        params.push(collName)
        clauses.push(`(p.collection_id = $${params.length - 1} OR p.specs->'extra_collections' @> to_jsonb($${params.length}::text))`)
      } else {
        params.push(collection_id)
        clauses.push(`p.collection_id = $${params.length}`)
      }
    }

    if (catalog_id) {
      params.push(catalog_id)
      clauses.push(`p.catalog_id = $${params.length}`)
    }

    if (category_id) {
      const ids = String(category_id).split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length > 0) {
        const placeholders = ids.map(id => {
          params.push(Number(id))
          return `$${params.length}`
        })
        const extraChecks = ids.map(id => {
          params.push(Number(id))
          return `p.specs->'extra_categories' @> to_jsonb($${params.length}::int)`
        })
        clauses.push(`(
          p.category_id IN (
            WITH RECURSIVE cat_tree AS (
              SELECT id FROM categories WHERE id IN (${placeholders.join(', ')})
              UNION ALL
              SELECT c.id FROM categories c
              INNER JOIN cat_tree ct ON c.parent_id = ct.id
            )
            SELECT id FROM cat_tree
          )
          OR ${extraChecks.join(' OR ')}
        )`)
      }
    }

    const search = String(q || '').trim().replace(/[%_]/g, '')
    if (search) {
      params.push(`%${search}%`)
      const placeholder = `$${params.length}`
      clauses.push(`(
        p.name ILIKE ${placeholder}
        OR p.description ILIKE ${placeholder}
        OR p.category ILIKE ${placeholder}
        OR coll.name ILIKE ${placeholder}
        OR cat.name ILIKE ${placeholder}
        OR catg.name ILIKE ${placeholder}
      )`)
    }

    if (clauses.length > 0) {
      text += ` WHERE ${clauses.join(' AND ')}`
    } else if (req.query.published === undefined && !isAdminRequest(req)) {
      text += ' WHERE p.published = true'
    }

    text += ' ORDER BY p.created_at DESC'

    const limitNum = Number(limit)
    const hasSearch = search.length > 0
    if (Number.isFinite(limitNum) && limitNum > 0) {
      text += ` LIMIT ${Math.min(100, Math.floor(limitNum))}`
    } else if (hasSearch) {
      text += ' LIMIT 100'
    }

    const { rows } = await query(text, params)
    res.json(rows.map(normalizeProduct))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Товар не найден' })
    if (!rows[0].published && !isAdminRequest(req)) {
      return res.status(404).json({ error: 'Товар не найден' })
    }
    const product = normalizeProduct(rows[0])
    const alsoSkus = Array.isArray(product.specs?.also_available_skus) ? product.specs.also_available_skus : []

    // Fetch color & finish variants (products with same base name)
    const { rows: variantRows } = await query(
      `${PRODUCT_SELECT} WHERE LOWER(TRIM(p.name)) = LOWER(TRIM($1)) AND p.id != $2 AND p.published = true`,
      [product.name, product.id]
    )
    product.color_variants = variantRows.map(normalizeProduct)

    // Exclude color_variant IDs from also_available list to avoid duplicates
    const variantIds = new Set(variantRows.map(r => r.id))
    const filterAlsoSkus = alsoSkus.filter(sku => sku !== product.specs?.sku)

    if (filterAlsoSkus.length > 0) {
      const { rows: alsoRows } = await query(
        `${PRODUCT_SELECT} WHERE p.specs->>'sku' IN (${filterAlsoSkus.map((_, i) => `$${i + 1}`).join(',')}) AND p.published = true`,
        filterAlsoSkus
      )
      product.also_available = alsoRows.map(normalizeProduct).filter(r => !variantIds.has(r.id))
    } else {
      product.also_available = []
    }

    res.json(product)
  } catch (err) {
    console.error('Error fetching product:', err)
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, price, category, in_stock, collection_id, catalog_id, category_id, published, specs } = req.body
  const { images, image_url } = normalizeProductInput(req.body)
  if (!name) return res.status(400).json({ error: 'Название обязательно' })

  if (collection_id && !(await validateCollectionRef(collection_id, 'category'))) {
    return res.status(400).json({ error: 'Коллекция не найдена' })
  }
  if (catalog_id && !(await validateCollectionRef(catalog_id, 'catalog'))) {
    return res.status(400).json({ error: 'Каталог не найден' })
  }
  if (category_id && !(await validateCategoryRef(category_id))) {
    return res.status(400).json({ error: 'Категория не найдена' })
  }

  try {
    const categoryLabel = await resolveCategoryLabel(category, category_id)
    const { rows } = await query(
      `INSERT INTO products (name, description, price, category, image_url, images, in_stock, collection_id, catalog_id, category_id, published, specs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        description || '',
        price ?? 0,
        categoryLabel,
        image_url,
        JSON.stringify(images),
        in_stock !== false,
        collection_id || null,
        catalog_id || null,
        category_id || null,
        published !== false,
        JSON.stringify(normalizeSpecs(specs)),
      ],
    )

    const { rows: full } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [rows[0].id])
    res.status(201).json(normalizeProduct(full[0]))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM products WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Товар не найден' })

    const e = normalizeProduct(existing[0])
    const { name, description, price, category, in_stock, collection_id, catalog_id, category_id, published, specs } = req.body

    if (collection_id && !(await validateCollectionRef(collection_id, 'category'))) {
      return res.status(400).json({ error: 'Коллекция не найдена' })
    }
    if (catalog_id && !(await validateCollectionRef(catalog_id, 'catalog'))) {
      return res.status(400).json({ error: 'Каталог не найден' })
    }
    if (category_id && !(await validateCategoryRef(category_id))) {
      return res.status(400).json({ error: 'Категория не найдена' })
    }

    const nextCollectionId = collection_id !== undefined
      ? (collection_id || null)
      : e.collection_id

    const nextCatalogId = catalog_id !== undefined
      ? (catalog_id || null)
      : e.catalog_id

    const nextCategoryId = category_id !== undefined
      ? (category_id || null)
      : e.category_id

    const categoryLabel = category_id !== undefined
      ? await resolveCategoryLabel(category, category_id || null)
      : (category ?? e.category)

    const nextSpecs = specs !== undefined
      ? JSON.stringify(normalizeSpecs(specs))
      : e.specs

    const hasImagesInput = req.body.images !== undefined || req.body.image_url !== undefined
    const nextImages = hasImagesInput
      ? normalizeProductInput(req.body)
      : { images: e.images, image_url: e.image_url }

    const nextPublished = published !== undefined ? !!published : (e.published !== false)

    const { rows } = await query(
      `UPDATE products
       SET name = $1, description = $2, price = $3, category = $4, image_url = $5,
           images = $6, in_stock = $7, collection_id = $8, catalog_id = $9,
           category_id = $10, published = $11, specs = $12, updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        name ?? e.name,
        description ?? e.description,
        price ?? e.price,
        categoryLabel ?? e.category,
        nextImages.image_url,
        JSON.stringify(nextImages.images),
        in_stock !== undefined ? in_stock : e.in_stock,
        nextCollectionId,
        nextCatalogId,
        nextCategoryId,
        nextPublished,
        nextSpecs,
        req.params.id,
      ],
    )

    const { rows: full } = await query(`${PRODUCT_SELECT} WHERE p.id = $1`, [rows[0].id])
    res.json(normalizeProduct(full[0]))
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM products WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Товар не найден' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

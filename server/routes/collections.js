import { Router } from 'express'
import { query } from '../db.js'
import { isAdminRequest, requireAdmin } from '../middleware/auth.js'

const router = Router()

const COLLECTION_KINDS = new Set(['category', 'catalog'])

function normalizeKind(kind, fallback = 'category') {
  return COLLECTION_KINDS.has(kind) ? kind : fallback
}

function collectionSelectSql() {
  return `SELECT c.*,
                 s.name AS season_name,
                 parent.name AS parent_collection_name
          FROM collections c
          LEFT JOIN seasons s ON s.id = c.season_id
          LEFT JOIN collections parent ON parent.id = c.parent_collection_id`
}

async function validateParentCollection(parentCollectionId) {
  if (!parentCollectionId) return null
  const { rows } = await query(
    `SELECT id, season_id FROM collections WHERE id = $1 AND kind = 'category'`,
    [parentCollectionId],
  )
  return rows[0] || null
}

async function resolveCatalogSeasonId({ season_id, parent_collection_id, kind }) {
  if (normalizeKind(kind) !== 'catalog') {
    return season_id
  }

  if (parent_collection_id) {
    const parent = await validateParentCollection(parent_collection_id)
    if (!parent) return { error: 'Коллекция не найдена' }
    return { season_id: parent.season_id, parent_collection_id: parent.id }
  }

  if (season_id) return { season_id, parent_collection_id: null }
  return { error: 'Выберите коллекцию' }
}

router.get('/', async (req, res) => {
  try {
    const { published, season_id } = req.query
    const conditions = []
    const params = []

    if (published === '1' || (!isAdminRequest(req) && published !== '0')) {
      params.push(true)
      conditions.push(`c.published = $${params.length}`)
    }
    if (season_id) {
      params.push(season_id)
      conditions.push(`c.season_id = $${params.length}`)
    }
    if (req.query.kind) {
      params.push(req.query.kind)
      conditions.push(`c.kind = $${params.length}`)
    }
    if (req.query.is_new === '1') {
      conditions.push('c.is_new = true')
    }
    if (req.query.hero === '1') {
      conditions.push('c.hero_order IS NOT NULL')
    }
    if (req.query.show_on_home === '1') {
      conditions.push('c.show_on_home = true')
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const orderBy = req.query.hero === '1'
      ? 'c.hero_order ASC'
      : req.query.show_on_home === '1'
        ? 'c.sort_order ASC, c.created_at DESC'
        : 'c.sort_order ASC, c.created_at DESC'

    const { rows } = await query(
      `${collectionSelectSql()}
       ${where}
       ORDER BY ${orderBy}`,
      params,
    )
    res.json(rows)
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `${collectionSelectSql()}
       WHERE c.id = $1`,
      [req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Коллекция не найдена' })
    if (!rows[0].published && !isAdminRequest(req)) {
      return res.status(404).json({ error: 'Коллекция не найдена' })
    }
    res.json(rows[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const {
    season_id,
    parent_collection_id,
    name,
    description,
    image_url,
    pdf_url,
    published,
    sort_order,
    kind,
    show_on_home,
    is_new,
  } = req.body
  if (!name) return res.status(400).json({ error: 'Название обязательно' })

  const normalizedKind = normalizeKind(kind)

  try {
    let nextSeasonId = season_id
    let nextParentCollectionId = parent_collection_id || null

    if (normalizedKind === 'catalog') {
      const resolved = await resolveCatalogSeasonId({
        season_id,
        parent_collection_id,
        kind: normalizedKind,
      })
      if (resolved.error) return res.status(400).json({ error: resolved.error })
      nextSeasonId = resolved.season_id
      nextParentCollectionId = resolved.parent_collection_id
    } else if (!season_id) {
      return res.status(400).json({ error: 'Выберите сезон' })
    }

    const { rows: seasons } = await query('SELECT id FROM seasons WHERE id = $1', [nextSeasonId])
    if (!seasons[0]) return res.status(400).json({ error: 'Сезон не найден' })

    const { rows } = await query(
      `INSERT INTO collections (
         season_id, parent_collection_id, name, description, image_url, pdf_url,
         published, sort_order, kind, show_on_home, hidden_categories, is_new
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        nextSeasonId,
        nextParentCollectionId,
        name,
        description || '',
        image_url || '',
        pdf_url || '',
        !!published,
        sort_order ?? 0,
        normalizedKind,
        !!show_on_home,
        JSON.stringify([]),
        !!is_new,
      ],
    )

    const { rows: full } = await query(
      `${collectionSelectSql()}
       WHERE c.id = $1`,
      [rows[0].id],
    )
    res.status(201).json(full[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM collections WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ error: 'Коллекция не найдена' })

    const e = existing[0]
    const {
      season_id,
      parent_collection_id,
      name,
      description,
      image_url,
      pdf_url,
      published,
      sort_order,
      kind,
      show_on_home,
      category_images,
      hidden_categories,
      is_new,
    } = req.body

    const normalizedKind = kind !== undefined ? normalizeKind(kind, e.kind) : e.kind
    let nextSeasonId = season_id ?? e.season_id
    let nextParentCollectionId = parent_collection_id !== undefined
      ? (parent_collection_id || null)
      : e.parent_collection_id

    if (normalizedKind === 'catalog') {
      const resolved = await resolveCatalogSeasonId({
        season_id: nextSeasonId,
        parent_collection_id: nextParentCollectionId,
        kind: normalizedKind,
      })
      if (resolved.error) return res.status(400).json({ error: resolved.error })
      nextSeasonId = resolved.season_id
      nextParentCollectionId = resolved.parent_collection_id
    } else if (season_id) {
      const { rows: seasons } = await query('SELECT id FROM seasons WHERE id = $1', [season_id])
      if (!seasons[0]) return res.status(400).json({ error: 'Сезон не найден' })
      nextParentCollectionId = null
    }

    const { rows } = await query(
      `UPDATE collections
       SET season_id = $1,
           parent_collection_id = $2,
           name = $3,
           description = $4,
           image_url = $5,
           pdf_url = $6,
           published = $7,
           sort_order = $8,
           kind = $9,
           show_on_home = $10,
           category_images = $11,
           hidden_categories = $12,
           is_new = $13,
           updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        nextSeasonId,
        nextParentCollectionId,
        name ?? e.name,
        description ?? e.description,
        image_url ?? e.image_url,
        pdf_url !== undefined ? pdf_url : (e.pdf_url ?? ''),
        published !== undefined ? published : e.published,
        sort_order ?? e.sort_order,
        normalizedKind,
        show_on_home !== undefined ? !!show_on_home : e.show_on_home,
        category_images !== undefined ? category_images : e.category_images,
        hidden_categories !== undefined ? JSON.stringify(hidden_categories) : e.hidden_categories,
        is_new !== undefined ? !!is_new : e.is_new,
        req.params.id,
      ],
    )

    const { rows: full } = await query(
      `${collectionSelectSql()}
       WHERE c.id = $1`,
      [rows[0].id],
    )
    res.json(full[0])
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM collections WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Коллекция не найдена' })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Ошибка сервера' })
  }
})

export default router

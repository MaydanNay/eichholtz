import { query } from '../db.js'

export const DEFAULT_CATALOGS = [
  {
    name: 'Spring-Summer 2026',
    parent_collection_name: 'Spring 2025',
    image_url: '/images/catalogues/spring-summer-2026.jpg',
    pdf_url: 'https://files.ideadecor.kz/Eichholtz/Spring-Summer_2026_.pdf',
    sort_order: 1,
  },
  {
    name: 'Spring 2025',
    parent_collection_name: 'Spring 2025',
    image_url: '/images/catalogues/spring-2025.webp',
    pdf_url: 'https://files.eichholtz.kz/Eichholtz_Spring_2025.pdf',
    sort_order: 2,
  },
  {
    name: 'The MET',
    parent_collection_name: 'The MET',
    image_url: '/images/catalogues/the-met.webp',
    pdf_url: 'https://files.eichholtz.kz/Eichholtz_The-Met-New%20Collection-2025.pdf',
    sort_order: 3,
  },
  {
    name: 'Fall 2025',
    parent_collection_name: 'Fall 2025',
    image_url: '/images/catalogues/fall-2025.webp',
    pdf_url: 'https://files.eichholtz.kz/Eichholtz_Magazine-Winter-Fall-Collection-2025_Spreads.pdf',
    sort_order: 4,
  },
  {
    name: 'Outdoor Collection',
    parent_collection_name: 'Outdoor Collection',
    image_url: '/images/catalogues/outdoor.jpg',
    pdf_url: 'https://files.ideadecor.kz/Eichholtz/Eichholtz_Outdoor_Booklet.pdf',
    sort_order: 5,
  },
  {
    name: 'The Met Collection',
    parent_collection_name: 'The MET',
    image_url: '/images/catalogues/the-met-collection.jpg',
    pdf_url: 'https://files.ideadecor.kz/Eichholtz/The_Met-Eichholtz_Collection_Booklet_Digital.pdf',
    sort_order: 6,
  },
]

async function ensureCatalogSeason() {
  const { rows } = await query(
    `SELECT id FROM seasons WHERE name = 'Каталоги' ORDER BY id LIMIT 1`,
  )

  if (rows[0]) return rows[0].id

  const { rows: created } = await query(
    `INSERT INTO seasons (name, description, image_url, published)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [
      'Каталоги',
      'PDF-каталоги коллекций Eichholtz',
      DEFAULT_CATALOGS[0].image_url,
    ],
  )

  return created[0].id
}

async function findParentCollectionId(name) {
  if (!name) return null

  const { rows } = await query(
    `SELECT id FROM collections
     WHERE kind = 'category' AND name = $1
     ORDER BY id
     LIMIT 1`,
    [name],
  )
  if (rows[0]) return rows[0].id

  const { rows: fuzzy } = await query(
    `SELECT id FROM collections
     WHERE kind = 'category'
       AND (
         $1 ILIKE '%' || name || '%'
         OR name ILIKE '%' || $1 || '%'
       )
     ORDER BY length(name) DESC
     LIMIT 1`,
    [name],
  )

  return fuzzy[0]?.id || null
}

async function linkCatalogToCollection(catalogId, parentCollectionName) {
  const parentCollectionId = await findParentCollectionId(parentCollectionName)
  if (!parentCollectionId) return

  const { rows: parent } = await query(
    `SELECT season_id FROM collections WHERE id = $1`,
    [parentCollectionId],
  )
  if (!parent[0]) return

  await query(
    `UPDATE collections
     SET parent_collection_id = $1,
         season_id = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [parentCollectionId, parent[0].season_id, catalogId],
  )
}

export async function seedDefaultCatalogs() {
  const seasonId = await ensureCatalogSeason()

  for (const catalog of DEFAULT_CATALOGS) {
    const { rows: existing } = await query(
      `SELECT id, parent_collection_id FROM collections WHERE name = $1 AND kind = 'catalog' LIMIT 1`,
      [catalog.name],
    )

    if (existing[0]) {
      await query(
        `UPDATE collections
         SET season_id = $1,
             image_url = CASE WHEN COALESCE(image_url, '') = '' THEN $2 ELSE image_url END,
             pdf_url = CASE WHEN COALESCE(pdf_url, '') = '' THEN $3 ELSE pdf_url END,
             sort_order = $4,
             kind = 'catalog',
             updated_at = NOW()
         WHERE id = $5`,
        [seasonId, catalog.image_url, catalog.pdf_url, catalog.sort_order, existing[0].id],
      )

      if (!existing[0].parent_collection_id && catalog.parent_collection_name) {
        await linkCatalogToCollection(existing[0].id, catalog.parent_collection_name)
      }
      continue
    }

    const { rows: created } = await query(
      `INSERT INTO collections (season_id, name, description, image_url, pdf_url, published, sort_order, kind)
       VALUES ($1, $2, '', $3, $4, true, $5, 'catalog')
       RETURNING id`,
      [seasonId, catalog.name, catalog.image_url, catalog.pdf_url, catalog.sort_order],
    )

    if (catalog.parent_collection_name) {
      await linkCatalogToCollection(created[0].id, catalog.parent_collection_name)
    }
  }

  await query(`
    UPDATE collections cat
    SET parent_collection_id = coll.id,
        season_id = coll.season_id,
        updated_at = NOW()
    FROM collections coll
    WHERE cat.kind = 'catalog'
      AND coll.kind = 'category'
      AND cat.parent_collection_id IS NULL
      AND cat.name = coll.name
  `)
}

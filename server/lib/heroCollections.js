import { query } from '../db.js'

export const DEFAULT_FEATURED_COLLECTIONS = [
  {
    name: 'Коллекция зима 2025',
    image_url: '/images/hero/hero-1.jpg',
    hero_order: 1,
    sort_order: 5,
    show_on_home: true,
  },
  {
    name: 'The Met x Eichholtz',
    image_url: '/images/hero/hero-2.jpg',
    hero_order: 2,
    sort_order: 3,
    show_on_home: true,
  },
  {
    name: 'New Collection - January 2026',
    image_url: '/images/hero/hero-3.jpg',
    hero_order: 3,
    sort_order: 1,
    show_on_home: true,
  },
  {
    name: 'Corey Damen Jenkins',
    image_url: '/images/catalogs/the-met.webp',
    hero_order: null,
    sort_order: 4,
    show_on_home: true,
  },
  {
    name: 'Maison Moghadam',
    image_url: '/images/catalogs/fall-2025.webp',
    hero_order: null,
    sort_order: 6,
    show_on_home: true,
  },
]

async function ensureProductSeason() {
  const { rows } = await query(
    `SELECT id FROM seasons WHERE name = 'NEW' LIMIT 1`,
  )

  if (rows[0]) return rows[0].id

  const { rows: created } = await query(
    `INSERT INTO seasons (name, description, image_url, published)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [
      'NEW',
      'Новая коллекция Eichholtz',
      DEFAULT_FEATURED_COLLECTIONS[0].image_url,
    ],
  )

  return created[0].id
}

export async function seedDefaultHeroCollections() {
  const seasonId = await ensureProductSeason()

  for (const item of DEFAULT_FEATURED_COLLECTIONS) {
    const { rows: existing } = await query(
      `SELECT id, image_url, hero_order FROM collections
       WHERE name = $1 AND kind = 'category'
       LIMIT 1`,
      [item.name],
    )

    if (existing[0]) {
      await query(
        `UPDATE collections
         SET season_id = COALESCE(season_id, $1),
             image_url = CASE WHEN COALESCE(image_url, '') = '' THEN $2 ELSE image_url END,
             hero_order = COALESCE($3::integer, hero_order),
             sort_order = $4,
             show_on_home = CASE WHEN $6 THEN true ELSE show_on_home END,
             kind = 'category',
             updated_at = NOW()
         WHERE id = $5`,
        [
          seasonId,
          item.image_url,
          item.hero_order,
          item.sort_order,
          existing[0].id,
          item.show_on_home,
        ],
      )
      continue
    }

    await query(
      `INSERT INTO collections (
         season_id, name, description, image_url, published, sort_order, kind, hero_order, show_on_home
       )
       VALUES ($1, $2, '', $3, true, $4, 'category', $5, $6)`,
      [seasonId, item.name, item.image_url, item.sort_order, item.hero_order, !!item.show_on_home],
    )
  }

  await query(
    `UPDATE collections
     SET show_on_home = true, updated_at = NOW()
     WHERE kind = 'category'
       AND name = ANY($1::text[])`,
    [DEFAULT_FEATURED_COLLECTIONS.map((item) => item.name)],
  )
}

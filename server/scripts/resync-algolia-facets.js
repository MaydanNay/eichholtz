/**
 * Resync facet specs from Algolia:
 * - material ← website_material_filter
 * - color ← color
 * - fabric ← fabric (clear if absent)
 * - shape ← shape (clear if absent)
 * - finish ← finish ONLY (never copy color); clear if Algolia has no finish
 *
 * Also clears leftover finish===color copies and normalizes casing (ДЖУТ→Джут).
 *
 * Usage: node server/scripts/resync-algolia-facets.js
 */
import { query, initDb, closePool } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const INDEX = 'live_magento2_en_products'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const VALUE_MAP = {
  Metal: 'Металл',
  Fabric: 'Ткань',
  Glass: 'Стекло',
  Wood: 'Дерево',
  'Marble/stone': 'Мрамор/камень',
  Marble: 'Мрамор',
  'Faux marble': 'Искусственный мрамор',
  Alabaster: 'Алебастр',
  Ceramic: 'Керамика',
  Concrete: 'Бетон',
  Rattan: 'Ротанг',
  Teak: 'Тик',
  Plastic: 'Пластик',
  Acrylic: 'Акрил',
  Leather: 'Кожа',
  Viscose: 'Вискоза',
  Jute: 'Джут',
  'Mirror glass': 'Зеркальное стекло',
  Mirror: 'Зеркало',
  Crystal: 'Хрусталь',
  Composite: 'Композит',
  Paper: 'Бумага',
  Travertine: 'Травертин',
  Resin: 'Смола',
  'Faux rattan': 'Искусственный ротанг',
  Fiberglass: 'Стекловолокно',
  Wool: 'Шерсть',
  'Horn/bone': 'Рог/кость',
  'Horn/bone look': 'Под рог/кость',
  'Leather look': 'Экокожа',
  Raffia: 'Рафия',

  Gold: 'Золотой',
  'Antique gold': 'Античное золото',
  Silver: 'Серебряный',
  Bronze: 'Бронзовый',
  Copper: 'Медный',
  Black: 'Чёрный',
  White: 'Белый',
  'Off-white': 'Молочно-белый',
  'White | Off-white': 'Белый | Молочно-белый',
  Ivory: 'Слоновая кость',
  Cream: 'Кремовый',
  Beige: 'Бежевый',
  Sand: 'Песочный',
  Grey: 'Серый',
  Gray: 'Серый',
  Brown: 'Коричневый',
  Green: 'Зелёный',
  Blue: 'Синий',
  Navy: 'Тёмно-синий',
  Red: 'Красный',
  Orange: 'Оранжевый',
  Yellow: 'Жёлтый',
  Pink: 'Розовый',
  Purple: 'Фиолетовый',
  Clear: 'Прозрачный',
  Transparent: 'Прозрачный',
  Natural: 'Натуральный',
  Smoke: 'Дымчатый',
  Champagne: 'Шампань',
  Nickel: 'Никель',
  Chrome: 'Хром',
  Gunmetal: 'Оружейная сталь',
  Charcoal: 'Угольный',
  Taupe: 'Тауп',
  Mocha: 'Мокко',
  Cognac: 'Коньячный',
  Greige: 'Грейж',
  Multicolor: 'Мультицвет',
  Multi: 'Мультицвет',

  'Brass (antiqued)': 'Латунь (состаренная)',
  'Brass (brushed)': 'Латунь (матовая)',
  'Copper (brushed)': 'Медь (матовая)',
  'Steel (brushed)': 'Сталь (матовая)',
  'Antique gold': 'Античное золото',
  Brass: 'Латунь',
  Steel: 'Сталь',
  Iron: 'Железо',

  Rectangular: 'Прямоугольная',
  Square: 'Квадратная',
  Round: 'Круглая',
  Oval: 'Овальная',
  'Free form': 'Свободная форма',
  'Semi round': 'Полукруглая',
  Triangular: 'Треугольная',
  Hexagonal: 'Шестиугольная',
  Organic: 'Органическая',

  Bouclé: 'Букле',
  'Boucle': 'Букле',
  Velvet: 'Бархат',
  Lyssa: 'Лисса',
  Savona: 'Savona',
  Sunbrella: 'Sunbrella',
  Mademoiselle: 'Mademoiselle',
  Roche: 'Roche',
  Camari: 'Камари',
  Florent: 'Florent',
  Avalon: 'Avalon',
  Canberra: 'Canberra',
  Bernard: 'Bernard',
  Loki: 'Локи',
  Nuoro: 'Нуоро',
  Flores: 'Flores',
  Pausa: 'Pausa',
  Sonata: 'Sonata',
  Linen: 'Лён',
  Cotton: 'Хлопок',
  Polyester: 'Полиэстер',
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function translateOne(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return ''
  if (VALUE_MAP[text]) return VALUE_MAP[text]
  const lower = text.toLowerCase()
  for (const [k, v] of Object.entries(VALUE_MAP)) {
    if (k.toLowerCase() === lower) return v
  }
  // already Cyrillic / brand names
  if (/[а-яА-ЯёЁ]/.test(text)) {
    if (text.toUpperCase() === 'ДЖУТ') return 'Джут'
    return text
  }
  return text
}

function translateValue(raw) {
  if (raw == null || raw === '') return null
  if (Array.isArray(raw)) {
    const parts = raw.map((v) => translateOne(String(v).trim())).filter(Boolean)
    if (parts.length === 0) return null
    if (parts.length === 1) return parts[0]
    return parts
  }
  const text = String(raw).trim()
  if (!text) return null
  // Algolia sometimes sends "Bronze ,  Gunmetal" as one finish string with odd spaces
  if (text.includes(',') && !text.startsWith('[')) {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1 && parts.every((p) => p.length < 40)) {
      const translated = parts.map(translateOne).filter(Boolean)
      return translated.length === 1 ? translated[0] : translated
    }
  }
  if (text.includes('|')) {
    return text
      .split('|')
      .map((p) => translateOne(p.trim()))
      .filter(Boolean)
      .join(' | ')
  }
  return translateOne(text)
}

function normalizeExisting(value) {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const parts = value.map((v) => translateOne(String(v).trim())).filter(Boolean)
    if (parts.length === 0) return null
    if (parts.length === 1) return parts[0]
    return parts
  }
  const text = String(value).trim()
  if (!text) return null
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return normalizeExisting(parsed)
    } catch {
      /* keep */
    }
  }
  if (text.toUpperCase() === 'ДЖУТ') return 'Джут'
  // unify "Бежевый, Песочный" with pipe form when both tokens known
  if (text.includes(',') && !/\d,\d/.test(text)) {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 2 && parts.every((p) => p.length < 40)) {
      // keep comma form as array for consistency with Algolia multi-values
      return parts.map(translateOne)
    }
  }
  return text
}

async function fetchApiKey() {
  const res = await fetch('https://www.eichholtz.com/en/sale.html', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  })
  const html = await res.text()
  const m = html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  if (!m) throw new Error('Algolia apiKey not found on eichholtz.com')
  return m[1]
}

async function algoliaQuery(apiKey, body) {
  const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${INDEX}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Algolia HTTP ${res.status}`)
  return res.json()
}

const ATTRS = [
  'sku',
  'objectID',
  'color',
  'finish',
  'fabric',
  'shape',
  'website_material_filter',
]

async function fetchAllHits(apiKey) {
  // Algolia public search caps ~1000 hits per query — walk Collection category tree.
  const map = new Map()
  const ingest = (hit) => {
    const sku = String(hit?.sku || '').trim()
    if (!sku) return
    map.set(sku, hit)
  }

  const facetRes = await algoliaQuery(apiKey, {
    query: '',
    hitsPerPage: 0,
    facets: ['categories.level1', 'categories.level2', 'categories.level3'],
    maxValuesPerFacet: 1000,
  })
  const level1 = facetRes.facets?.['categories.level1'] || {}
  const collectionL1 = Object.keys(level1).filter(
    (k) => k.startsWith('Collection ///') && k !== 'Collection /// New',
  )

  for (const l1 of collectionL1) {
    const q2 = await algoliaQuery(apiKey, {
      query: '',
      hitsPerPage: 0,
      facets: ['categories.level2'],
      maxValuesPerFacet: 1000,
      facetFilters: [[`categories.level1:${l1}`]],
    })
    const l2all = q2.facets?.['categories.level2'] || {}
    const prefix = `${l1} ///`
    const children = Object.keys(l2all).filter((k) => k.startsWith(prefix))
    const l2list = children.length ? children : [null]

    for (const l2 of l2list) {
      const filters = l2 ? [[`categories.level2:${l2}`]] : [[`categories.level1:${l1}`]]
      const q3 = await algoliaQuery(apiKey, {
        query: '',
        hitsPerPage: 0,
        facets: ['categories.level3'],
        maxValuesPerFacet: 1000,
        facetFilters: filters,
      })
      const n = q3.nbHits || 0
      const l3all = q3.facets?.['categories.level3'] || {}
      const pref = `${l2 || l1} ///`
      const grandchildren = Object.keys(l3all).filter((k) => k.startsWith(pref))
      const buckets = n > 900 && grandchildren.length ? grandchildren : [null]

      for (const l3 of buckets) {
        const ff = l3 ? [[`categories.level3:${l3}`]] : filters
        let page = 0
        while (page < 10) {
          const data = await algoliaQuery(apiKey, {
            query: '',
            hitsPerPage: 100,
            page,
            attributesToRetrieve: ATTRS,
            facetFilters: ff,
          })
          const hits = data.hits || []
          for (const h of hits) ingest(h)
          if (!hits.length || page + 1 >= (data.nbPages || 1)) break
          page += 1
        }
      }
    }
    console.log(`  collected ${l1}: unique SKUs ${map.size}`)
  }

  // Also pull Sale / New if present as top-level paths
  for (const extra of ['Sale', 'Collection /// New']) {
    for (const level of ['categories.level0', 'categories.level1']) {
      let page = 0
      while (page < 10) {
        const data = await algoliaQuery(apiKey, {
          query: '',
          hitsPerPage: 100,
          page,
          attributesToRetrieve: ATTRS,
          facetFilters: [[`${level}:${extra}`]],
        })
        const hits = data.hits || []
        for (const h of hits) ingest(h)
        if (!hits.length || page + 1 >= (data.nbPages || 1)) break
        page += 1
      }
    }
  }

  return [...map.values()]
}

function applyAlgoliaToSpecs(specs, hit) {
  const next = { ...specs }
  let changed = false

  const material = translateValue(hit.website_material_filter)
  const color = translateValue(hit.color)
  const fabric = translateValue(hit.fabric)
  const shape = translateValue(hit.shape)
  const finish = translateValue(hit.finish)

  if (material != null) {
    if (!deepEqual(next.material, material)) {
      next.material = material
      changed = true
    }
  }

  if (color != null) {
    if (!deepEqual(next.color, color)) {
      next.color = color
      changed = true
    }
  }

  if (fabric != null) {
    if (!deepEqual(next.fabric, fabric)) {
      next.fabric = fabric
      changed = true
    }
  } else if (next.fabric != null && next.fabric !== '') {
    delete next.fabric
    changed = true
  }

  if (shape != null) {
    if (!deepEqual(next.shape, shape)) {
      next.shape = shape
      changed = true
    }
  } else if (next.shape != null && next.shape !== '') {
    delete next.shape
    changed = true
  }

  // Finish: only from Algolia finish — never from color
  if (finish != null) {
    if (!deepEqual(next.finish, finish)) {
      next.finish = finish
      changed = true
    }
  } else if (next.finish != null && next.finish !== '') {
    delete next.finish
    changed = true
  }

  return { next, changed }
}

function cleanupLocalOnly(specs) {
  const next = { ...specs }
  let changed = false

  for (const key of ['material', 'finish', 'fabric', 'shape', 'color']) {
    if (next[key] == null || next[key] === '') continue
    const normalized = normalizeExisting(next[key])
    if (!deepEqual(next[key], normalized)) {
      if (normalized == null) delete next[key]
      else next[key] = normalized
      changed = true
    }
  }

  // Safety: if finish still equals color, drop finish (color-copy leftover)
  if (
    next.finish != null &&
    next.color != null &&
    deepEqual(next.finish, next.color)
  ) {
    delete next.finish
    changed = true
  }

  return { next, changed }
}

async function run() {
  console.log('=== RESYNC ALGOLIA FACETS ===')
  await initDb()

  const apiKey = await fetchApiKey()
  console.log('Algolia key ok')

  const hits = await fetchAllHits(apiKey)
  console.log(`Algolia hits: ${hits.length}`)

  const bySku = new Map()
  for (const hit of hits) {
    const sku = String(hit.sku || '').trim()
    if (!sku) continue
    bySku.set(sku, hit)
  }
  console.log(`Algolia unique SKUs: ${bySku.size}`)

  const { rows } = await query(`
    SELECT id, specs
    FROM products
    WHERE published = true
  `)
  console.log(`DB products: ${rows.length}`)

  let matched = 0
  let updated = 0
  let clearedFinishCopies = 0
  let unmatched = 0

  for (const row of rows) {
    const specs =
      typeof row.specs === 'string' ? JSON.parse(row.specs || '{}') : { ...(row.specs || {}) }
    const sku = String(specs.sku || '').trim()
    const hit = sku ? bySku.get(sku) : null

    let changed = false
    let next = specs

    if (hit) {
      matched += 1
      const applied = applyAlgoliaToSpecs(next, hit)
      next = applied.next
      changed = applied.changed
    } else {
      unmatched += 1
      const cleaned = cleanupLocalOnly(next)
      next = cleaned.next
      changed = cleaned.changed
      if (
        specs.finish != null &&
        specs.color != null &&
        deepEqual(specs.finish, specs.color) &&
        next.finish == null
      ) {
        clearedFinishCopies += 1
      }
    }

    // Always run safety cleanup
    const beforeFinish = next.finish
    const cleaned = cleanupLocalOnly(next)
    next = cleaned.next
    if (cleaned.changed) changed = true
    if (beforeFinish != null && next.finish == null && next.color != null && deepEqual(beforeFinish, next.color)) {
      clearedFinishCopies += 1
    }

    if (changed) {
      await query('UPDATE products SET specs = $1::jsonb, updated_at = NOW() WHERE id = $2', [
        JSON.stringify(next),
        row.id,
      ])
      updated += 1
      if (updated % 200 === 0) console.log(`  updated ${updated}...`)
    }
  }

  const { rows: stats } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE specs ? 'finish') AS has_finish,
      COUNT(*) FILTER (
        WHERE specs ? 'finish' AND specs ? 'color'
          AND specs->>'finish' = specs->>'color'
      ) AS finish_eq_color,
      COUNT(*) FILTER (WHERE specs ? 'fabric') AS has_fabric,
      COUNT(*) FILTER (WHERE specs ? 'shape') AS has_shape,
      COUNT(*) FILTER (WHERE specs ? 'material') AS has_material,
      COUNT(*) FILTER (WHERE specs ? 'color') AS has_color
    FROM products
    WHERE published = true
  `)

  console.log({
    matched,
    unmatched,
    updated,
    clearedFinishCopies,
    stats: stats[0],
  })
  console.log('DONE')
  await closePool()
}

run().catch(async (err) => {
  console.error(err)
  await closePool().catch(() => {})
  process.exit(1)
})

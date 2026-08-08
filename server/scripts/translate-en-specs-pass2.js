/**
 * Second pass: translate remaining English human phrases in specs via MyMemory.
 * Skips technical codes (E14, Volt) and short likely brand names.
 *
 * Usage: node server/scripts/translate-en-specs-pass2.js
 */
import fs from 'fs'
import { query, initDb, closePool } from '../db.js'

const CACHE_PATH = '/tmp/eicholtz-specs-translations.json'
const CYR = /[а-яА-ЯёЁ]/
const SKIP_KEYS = new Set([
  'sku',
  'objectid',
  'also_available_skus',
  'extra_categories',
  'extra_collections',
  'categories_without_path',
  'dimensions',
])

const EXTRA = {
  'Including outdoor cushion set': 'В комплекте уличные подушки',
  'Including outdoor cushion': 'В комплекте уличная подушка',
  'Including outdoor covers': 'В комплекте уличные чехлы',
  'Indoor & covered outdoor use': 'Для помещений и крытой улицы',
  'Faux rattan': 'Искусственный ротанг',
  'Sawtooth hanger, vertical': 'Зубчатый подвес, вертикальный',
  'Sawtooth hanger, horizontal': 'Зубчатый подвес, горизонтальный',
  'Sawtooth hanger, horizontal and vertical': 'Зубчатый подвес, горизонтальный и вертикальный',
  'Nickel finish': 'Никелевая отделка',
  'Black finish': 'Чёрная отделка',
  'Sand finish': 'Песочная отделка',
  'Stone finish': 'Каменная отделка',
  'Green finish': 'Зелёная отделка',
  'Taupe finish': 'Отделка тауп',
  'Antique bronze finish': 'Античная бронза',
  'Antique gold finish': 'Античное золото',
  'Antiqued gold leaf': 'Состаренная золотая поталь',
  'Matte brass finish': 'Матовая латунь',
  'Piano black finish': 'Рояльный чёрный',
  'Copper bronze finish': 'Медно-бронзовая отделка',
  'Black finish | sunbrella canvas': 'Чёрная отделка | ткань Sunbrella',
  'Sand finish | sunbrella canvas': 'Песочная отделка | ткань Sunbrella',
  'Natural teak': 'Натуральный тик',
  'Bouclé': 'Букле',
  'Off white': 'Молочно-белый',
  'Multi colored': 'Многоцветный',
  'Beige & white': 'Бежевый и белый',
  'Black & gold': 'Чёрный и золотой',
  'Agate stone': 'Агат',
  'Natural onyx': 'Натуральный оникс',
  'Natural raffia': 'Натуральная рафия',
  'Polished aluminium': 'Полированный алюминий',
  'Faux travertine': 'Искусственный травертин',
  'Horn/bone': 'Рог/кость',
  'Horn/bone look': 'Под рог/кость',
  'Wine racks': 'Винные стойки',
  '100% buffalo leather': '100% кожа буйвола',
  'Each piece is unique and differs in color and size':
    'Каждое изделие уникально и отличается по цвету и размеру',
  'Onyx is a natural material. Each piece differs in color variations and veining':
    'Оникс — натуральный материал: цвет и прожилки уникальны для каждого изделия',
  'Including pleated white shade': 'В комплекте белый плиссированный абажур',
  'Including pleated black shade': 'В комплекте чёрный плиссированный абажур',
  'Including pleated white shades': 'В комплекте белые плиссированные абажуры',
  'Including beige pleated shade': 'В комплекте бежевый плиссированный абажур',
  'Including orange pleated shade': 'В комплекте оранжевый плиссированный абажур',
  'Including red silk shade': 'В комплекте красный шёлковый абажур',
  'Suitable for 58 x H. 22 mm tealight': 'Подходит для чайной свечи 58 × H. 22 мм',
  'Hand blown glass | brown colour': 'Выдувное стекло | коричневый',
  'Hand blown glass | grey colour': 'Выдувное стекло | серый',
  'Hand blown glass | yellow colour': 'Выдувное стекло | жёлтый',
  'Hand blown glass | sand colour': 'Выдувное стекло | песочный',
  'Hand blown glass | blue colour': 'Выдувное стекло | синий',
  'Hand blown glass | purple colour': 'Выдувное стекло | фиолетовый',
  'Hand blown glass | dark brown colour': 'Выдувное стекло | тёмно-коричневый',
  'Hand blown glass | green colour': 'Выдувное стекло | зелёный',
  'Handblown glass | frosted': 'Выдувное стекло | матовое',
  'Handmade glass | handcut pattern': 'Стекло ручной работы | ручная огранка',
  'Brown marble': 'Коричневый мрамор',
  'Light grey glaze': 'Светло-серая глазурь',
  'MATTE WHITE': 'Матовый белый',
  'Crystal glass | nickel finish': 'Хрустальное стекло | никелевая отделка',
  'Nickel finish | crystal glass': 'Никелевая отделка | хрустальное стекло',
  'Copper (brushed)': 'Медь (матовая)',
  'Sand finish ceramic': 'Керамика с песочной отделкой',
  'Black finish ceramic': 'Керамика с чёрной отделкой',
  'Frosted light brown': 'Матовый светло-коричневый',
  'Grey bone': 'Серая кость',
}

function loadCache() {
  try {
    return { ...JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')), ...EXTRA }
  } catch {
    return { ...EXTRA }
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}

function shouldSkip(text) {
  const s = String(text || '').trim()
  if (!s || CYR.test(s) || !/[A-Za-z]/.test(s)) return true
  if (/^(E\d+|GU?\d+|G\d+|LED|IP\d+)$/i.test(s)) return true
  if (/volt/i.test(s) && /\d/.test(s)) return true
  if (/^\d/.test(s) && /(lm|hrs|mm|cm)/i.test(s)) return true
  if (/^[øØ]/.test(s)) return true
  if (/^[A-Z]{2,}$/.test(s) && s.length <= 12) return true // SENTIER, AVELIN
  // short single Proper noun without spaces → brand/fabric name
  if (/^[A-Z][a-zà-ÿ]+$/.test(s) && !EXTRA[s] && s.length <= 14) return true
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(s) && !/\s(finish|glass|leather|teak|rattan|cushion|outdoor|indoor|hanger|shade|marble|stone|veneer|colour|color|base|feet|edge|rope|weave|canvas)/i.test(s) && s.split(' ').length <= 2 && s.length <= 18) {
    // likely "Florent", "Viola", "Harley Leopard" etc - keep brand-ish unless in EXTRA
    if (!EXTRA[s] && !/finish|glass|leather|teak|rattan|cushion|outdoor|indoor|hanger|shade|marble|stone|veneer|colour|color|base|feet|edge|rope|weave|canvas|including|hand|faux|natural|antique|matte|polished|suitable|each|onyx|horn|bone|multi|beige|black|white|sand|green|brown|grey|gray|copper|nickel|brass|bronze|crystal|aluminium|aluminum|ceramic|glaze|buffalo/i.test(s)) {
      return true
    }
  }
  return false
}

async function translateMyMemory(text) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=en|ru'
  const res = await fetch(url, { headers: { 'User-Agent': 'eicholtz-kz-specs2/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const out = data?.responseData?.translatedText?.trim() || ''
  if (!out || /MYMEMORY WARNING/i.test(out)) throw new Error(out.slice(0, 80) || 'empty')
  return out
}

function collectUnique(rows) {
  const freq = new Map()
  const add = (s) => {
    s = String(s || '').trim()
    if (shouldSkip(s)) return
    freq.set(s, (freq.get(s) || 0) + 1)
  }
  for (const row of rows) {
    let sp = row.specs
    if (typeof sp === 'string') {
      try {
        sp = JSON.parse(sp)
      } catch {
        continue
      }
    }
    if (!sp || typeof sp !== 'object') continue
    for (const [k, v] of Object.entries(sp)) {
      if (SKIP_KEYS.has(k.toLowerCase())) continue
      if (k === 'specifications' && v && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) {
          add(sk)
          add(sv)
        }
        continue
      }
      if (Array.isArray(v)) v.forEach(add)
      else add(v)
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s)
}

function replaceInSpecs(specs, map) {
  if (!specs || typeof specs !== 'object') return { specs, changed: false }
  const next = { ...specs }
  let changed = false

  const repl = (val) => {
    if (typeof val !== 'string') return val
    const t = val.trim()
    if (map[t] && map[t] !== t) return map[t]
    return val
  }

  if (next.specifications && typeof next.specifications === 'object') {
    const nested = {}
    for (const [k, v] of Object.entries(next.specifications)) {
      const nk = map[k] && map[k] !== k ? map[k] : k
      const nv = typeof v === 'string' ? repl(v) : v
      if (nk !== k || nv !== v) changed = true
      nested[nk] = nv
    }
    next.specifications = nested
  }

  for (const [k, v] of Object.entries(next)) {
    if (SKIP_KEYS.has(k.toLowerCase()) || k === 'specifications') continue
    if (typeof v === 'string') {
      const nv = repl(v)
      if (nv !== v) {
        next[k] = nv
        changed = true
      }
    } else if (Array.isArray(v)) {
      const arr = v.map((item) => (typeof item === 'string' ? repl(item) : item))
      if (arr.some((x, i) => x !== v[i])) {
        next[k] = arr
        changed = true
      }
    }
  }
  return { specs: next, changed }
}

async function run() {
  await initDb()
  const cache = loadCache()
  const { rows } = await query(`SELECT id, specs FROM products WHERE specs IS NOT NULL ORDER BY id`)
  const unique = collectUnique(rows)
  console.log(`Remaining candidates: ${unique.length}`)

  let translated = 0
  let failed = 0
  for (let i = 0; i < unique.length; i++) {
    const en = unique[i]
    if (cache[en] && CYR.test(cache[en])) {
      continue
    }
    if (EXTRA[en]) {
      cache[en] = EXTRA[en]
      translated++
      continue
    }
    try {
      const ru = await translateMyMemory(en)
      cache[en] = ru
      translated++
      console.log(`[${i + 1}/${unique.length}] ${en.slice(0, 60)} → ${ru.slice(0, 60)}`)
      await new Promise((r) => setTimeout(r, 700))
    } catch (e) {
      failed++
      console.log(`[${i + 1}/${unique.length}] FAIL ${en.slice(0, 60)}: ${e.message}`)
      await new Promise((r) => setTimeout(r, 1200))
    }
    if ((i + 1) % 25 === 0) saveCache(cache)
  }
  saveCache(cache)

  // Build apply map: only cyrillic translations
  const map = {}
  for (const [k, v] of Object.entries(cache)) {
    if (v && CYR.test(v) && v !== k) map[k] = v
  }
  Object.assign(map, EXTRA)

  let updated = 0
  for (const row of rows) {
    let specs = row.specs
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs)
      } catch {
        continue
      }
    }
    const { specs: next, changed } = replaceInSpecs(specs, map)
    if (changed) {
      await query(`UPDATE products SET specs = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(next),
        row.id,
      ])
      updated++
    }
  }

  const left = collectUnique(
    (
      await query(`SELECT id, specs FROM products WHERE specs IS NOT NULL`)
    ).rows,
  )
  console.log('\n=== DONE ===')
  console.log({ translated, failed, updated, left: left.length, leftTop: left.slice(0, 20) })
  await closePool()
}

run().catch(async (e) => {
  console.error(e)
  await closePool().catch(() => {})
  process.exit(1)
})

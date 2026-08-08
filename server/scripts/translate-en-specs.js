/**
 * Translate English product specs (values + specification keys) to Russian in-place.
 *
 * Usage: node server/scripts/translate-en-specs.js
 */
import fs from 'fs'
import { query, initDb, closePool } from '../db.js'

const CACHE_PATH = '/tmp/eicholtz-specs-translations.json'

const KEY_MAP = {
  'General info': 'Общая информация',
  'Indoor/outdoor': 'Применение',
  'Hanging Method': 'Способ крепления',
  'Fabric composition': 'Состав ткани',
  'Fabric composition shade': 'Состав ткани абажура',
  'Voltage': 'Напряжение',
  'Lamp holder': 'Цоколь',
  'Lamp holder qty': 'Количество цоколей',
  'Light bulbs included': 'Лампы в комплекте',
  'Shape': 'Форма',
  'Extra info': 'Дополнительно',
  'Plug type': 'Тип вилки',
  'Shade dimensions': 'Размеры абажура',
  'Length hanging method in cm': 'Длина подвеса, см',
  'Length hanging method in inch': 'Длина подвеса, дюймы',
  'Max wattage': 'Макс. мощность',
  'Max Weight Load KG': 'Макс. нагрузка, кг',
  'Max Weight Load LBS': 'Макс. нагрузка, фунты',
  'Net weight (kg)': 'Вес нетто, кг',
  'Net weight (lbs)': 'Вес нетто, фунты',
  'Gross weight (kg)': 'Вес брутто, кг',
  'Gross weight (lbs)': 'Вес брутто, фунты',
  'Country of origin': 'Страна производства',
  'Assembly': 'Сборка',
  'Care instructions': 'Уход',
}

const VALUE_MAP = {
  // usage
  'Indoor use/dry locations only': 'Только для помещений / сухих мест',
  'Indoor & outdoor use': 'Для помещений и улицы',
  'Outdoor use only': 'Только для улицы',
  'Not applicable': 'Не применимо',
  'Not included': 'Не входят в комплект',
  'Included': 'Входят в комплект',

  // materials / colors
  Metal: 'Металл',
  Fabric: 'Ткань',
  Glass: 'Стекло',
  Wood: 'Дерево',
  Marble: 'Мрамор',
  'Marble/stone': 'Мрамор/камень',
  Alabaster: 'Алебастр',
  Ceramic: 'Керамика',
  Concrete: 'Бетон',
  Rattan: 'Ротанг',
  Teak: 'Тик',
  Brass: 'Латунь',
  'Brass (antiqued)': 'Латунь (состаренная)',
  Steel: 'Сталь',
  Iron: 'Железо',
  Plastic: 'Пластик',
  Acrylic: 'Акрил',
  Leather: 'Кожа',
  Velvet: 'Бархат',
  Linen: 'Лён',
  Cotton: 'Хлопок',
  Polyester: 'Полиэстер',
  Viscose: 'Вискоза',
  Mirror: 'Зеркало',
  Travertine: 'Травертин',
  Resin: 'Смола',
  Crystal: 'Хрусталь',
  Bone: 'Кость',
  Shell: 'Ракушка',
  Rope: 'Канат',
  Cane: 'Тростник',
  Seagrass: 'Морская трава',
  Polyethylene: 'Полиэтилен',
  Polypropylene: 'Полипропилен',

  Gold: 'Золотой',
  'Antique gold': 'Античное золото',
  Silver: 'Серебряный',
  'Antique silver': 'Античное серебро',
  Bronze: 'Бронзовый',
  Copper: 'Медный',
  Black: 'Чёрный',
  White: 'Белый',
  'Off-white': 'Молочно-белый',
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
  Gunmetal: 'Оружейный металл',
  Charcoal: 'Угольный',
  Taupe: 'Тауп',
  Mocha: 'Мокко',
  Cognac: 'Коньячный',
  Rust: 'Ржавый',
  Multi: 'Мультицвет',
  Multicolor: 'Мультицвет',

  // shapes / hanging
  Rectangular: 'Прямоугольная',
  Square: 'Квадратная',
  Round: 'Круглая',
  Oval: 'Овальная',
  Organic: 'Органическая',
  'Free form': 'Свободная форма',
  Triangular: 'Треугольная',
  Hexagonal: 'Шестиугольная',
  Cylinder: 'Цилиндр',
  Globe: 'Шар',
  Cone: 'Конус',
  Chain: 'Цепь',
  Pipe: 'Труба',
  Cord: 'Шнур',
  Rod: 'Штанга',
  Cable: 'Кабель',
  'French cleat': 'Французский крепёж',
  'Wall mounted': 'Настенный монтаж',

  // finishes / phrases
  'Vintage brass finish': 'Состаренная латунь',
  'Antique brass finish': 'Античная латунь',
  'Brushed brass finish': 'Матовая латунь',
  'Polished brass finish': 'Полированная латунь',
  'Classic black finish': 'Классический чёрный',
  'Matte black finish': 'Матовый чёрный',
  'Brushed nickel finish': 'Матовый никель',
  'Chrome finish': 'Хромированная отделка',
  'Bronze finish': 'Бронзовая отделка',
  'Including linen mix shade': 'В комплекте абажур из смеси льна',
  'Marble is a natural material, each piece differs in color and veining':
    'Мрамор — натуральный материал: цвет и прожилки уникальны для каждого изделия',
  'Alabaster is a natural material, each piece differs in color, opacity and veining':
    'Алебастр — натуральный материал: цвет, прозрачность и прожилки уникальны для каждого изделия',

  // plugs / technical keep some as-is when needed
  'F - Schuko plug': 'Вилка F (Schuko)',
  'G - UK plug': 'Вилка G (UK)',
  'A - US plug': 'Вилка A (US)',
  'C - Euro plug': 'Вилка C (Euro)',

  // product groups (from catalog)
  Armchairs: 'Кресла',
  'Artificial flowers and greenery': 'Искусственные цветы и зелень',
  Ashtrays: 'Пепельницы',
  Bars: 'Барные стойки',
  Barstools: 'Барные стулья',
  'Bathroom accessories': 'Аксессуары для ванной',
  Benches: 'Скамейки',
  Bookends: 'Подставки для книг',
  Bowls: 'Чаши',
  Boxes: 'Коробки',
  'Buddhas/Ethnics/Bronzes': 'Статуэтки и этника',
  'Candle holders': 'Подсвечники',
  Candles: 'Свечи',
  Carpets: 'Ковры',
  'Ceiling lamps': 'Потолочные светильники',
  'Chaises longues': 'Шезлонги',
  Chandeliers: 'Люстры',
  Coatracks: 'Вешалки',
  'Coffee tables': 'Журнальные столы',
  Columns: 'Колонны',
  'Console tables': 'Консоли',
  'Deco accessories': 'Декор',
  'Desk lamps': 'Настольные лампы',
  Desks: 'Письменные столы',
  'Dining chairs': 'Обеденные стулья',
  'Dining tables': 'Обеденные столы',
  'Display cabinets': 'Витрины',
  Drawer: 'Комоды с ящиками',
  Dresser: 'Комоды',
  'Fireplace accessories': 'Аксессуары для камина',
  'Floor lamps': 'Торшеры',
  'Folding screens': 'Ширмы',
  Headboards: 'Изголовья',
  Hurricanes: 'Фонари-ураганы',
  'Light bulbs': 'Лампы',
  Nightstands: 'Прикроватные тумбы',
  Ottomans: 'Пуфы',
  'Outdoor accessories': 'Уличные аксессуары',
  'Outdoor beds': 'Уличные кровати',
  'Outdoor carpets': 'Уличные ковры',
  'Outdoor chairs': 'Уличные кресла',
  'Outdoor coffee tables': 'Уличные журнальные столы',
  'Outdoor console Tables': 'Уличные консоли',
  'Outdoor dining chairs': 'Уличные обеденные стулья',
  'Outdoor dining tables': 'Уличные обеденные столы',
  'Outdoor side tables': 'Уличные приставные столы',
  'Outdoor sofas': 'Уличные диваны',
  'Outdoor table lamps': 'Уличные настольные лампы',
  'Outdoor wall lamps': 'Уличные бра',
  'Picture Frames': 'Рамы',
  Pillows: 'Подушки',
  Planters: 'Кашпо',
  Prints: 'Принты',
  'Serving accessories': 'Сервировка',
  Shades: 'Абажуры',
  Shelving: 'Стеллажи',
  'Side tables': 'Приставные столы',
  Sofas: 'Диваны',
  Stools: 'Табуреты',
  'Table & Floor mirrors': 'Настольные и напольные зеркала',
  'Table lamps': 'Настольные лампы',
  Trolleys: 'Сервировочные тележки',
  'TV Cabinets': 'Тумбы под ТВ',
  'Umbrella stands': 'Подставки для зонтов',
  Vases: 'Вазы',
  'Wall accessories': 'Настенный декор',
  'Wall lamps': 'Бра',
  'Wall mirrors': 'Настенные зеркала',
  'Wardrobe cabinets': 'Шкафы',
  'Wine cabinets': 'Винные шкафы',
  'Wine coolers': 'Винные охладители',
  'Antique brass finish | clear glass': 'Античная латунь | прозрачное стекло',
  'Antique brass finish | alabaster': 'Античная латунь | алебастр',
  'clear glass': 'прозрачное стекло',
  'Clear glass': 'Прозрачное стекло',
  'smoked glass': 'дымчатое стекло',
  'Smoked glass': 'Дымчатое стекло',
  'frosted glass': 'матовое стекло',
  'brushed brass': 'матовая латунь',
  'Brushed brass': 'Матовая латунь',
  'vintage brass': 'состаренная латунь',
  'Vintage brass': 'Состаренная латунь',
  'antique brass': 'античная латунь',
  'Antique brass': 'Античная латунь',
  'matte black': 'матовый чёрный',
  'Matte black': 'Матовый чёрный',
  'polished brass': 'полированная латунь',
  'Polished nickel': 'Полированный никель',
  'Brushed nickel': 'Матовый никель',
  'Aged brass': 'Состаренная латунь',
  'Dark bronze': 'Тёмная бронза',
  'Light grey': 'Светло-серый',
  'Dark grey': 'Тёмно-серый',
  'Light brown': 'Светло-коричневый',
  'Dark brown': 'Тёмно-коричневый',
  'Yes': 'Да',
  'No': 'Нет',
  'Required': 'Требуется',
  'Not required': 'Не требуется',
  'Assembly required': 'Требуется сборка',
  'Fully assembled': 'В сборе',
  'Handcrafted': 'Ручная работа',
  'Handmade': 'Ручная работа',
  'Swivel': 'Поворотный',
  'Adjustable': 'Регулируемый',
  'Dimmable': 'С диммером',
  'LED': 'LED',
  'Including shade': 'С абажуром',
  'Excluding shade': 'Без абажура',
  'With shade': 'С абажуром',
  'Without shade': 'Без абажура',
  '100% polyester': '100% полиэстер',
  '100% linen': '100% лён',
  '100% cotton': '100% хлопок',
  '100% acrylic': '100% акрил',
  'White | Off-white': 'Белый | Молочно-белый',
  'Beige | Sand': 'Бежевый | Песочный',
  'Black | Brass': 'Чёрный | Латунь',
  'Black & brass': 'Чёрный и латунь',
  'black & brass finish': 'чёрная и латунная отделка',
  'black velvet piping': 'чёрный бархатный кант',
  'swivel base': 'поворотное основание',
  'teak wood': 'тик',
  'Grade A teak': 'тик класса A',
  'sustainably sourced': 'из экологически чистых источников',
}

const SKIP_KEYS = new Set([
  'sku',
  'objectid',
  'also_available_skus',
  'extra_categories',
  'extra_collections',
  'categories_without_path',
  'dimensions',
  'url',
  'url_key',
  'thumbnail_url',
  'image_url',
  'price',
  'type_id',
  'categories',
  'category_ids',
])

const CYR = /[а-яА-ЯёЁ]/
const HAS_LATIN = /[A-Za-z]/

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
}

function isMeasurementLike(text) {
  const t = String(text).replace(/\n/g, ' ').trim()
  if (!t) return true
  // E14 / E27 / voltages / pure composition percentages mostly keep
  if (/^(E\d+|GU\d+|LED|IP\d+)$/i.test(t)) return true
  if (/^\d+(\.\d+)?\s*(-|–|—)\s*\d+(\.\d+)?\s*Volt$/i.test(t)) return true
  if (/^\d+(\.\d+)?\s*%/.test(t) && !HAS_LATIN.test(t.replace(/%|polyester|viscose|acrylic|linen|cotton|wool|silk|nylon|polyamide|elastane|polyurethane/gi, ''))) {
    // fabric composition with english fiber names - NOT measurement
  }
  if (/^[LWDHS.\d\s|″'"′cmCMx×\-/,.+]+$/i.test(t)) return true
  return false
}

function lookupStatic(text) {
  if (VALUE_MAP[text]) return VALUE_MAP[text]
  if (KEY_MAP[text]) return KEY_MAP[text]
  const lower = text.toLowerCase()
  for (const [k, v] of Object.entries(VALUE_MAP)) {
    if (k.toLowerCase() === lower) return v
  }
  for (const [k, v] of Object.entries(KEY_MAP)) {
    if (k.toLowerCase() === lower) return v
  }
  return null
}

function translateCompound(text, translateOne) {
  // Split by | first (common in color combos), then commas carefully
  if (text.includes('|')) {
    return text
      .split('|')
      .map((p) => translateOne(p.trim()))
      .join(' | ')
  }
  // "Antique brass finish | clear glass" already handled
  // "Fabric, Metal"
  if (text.includes(',') && !/\d,\d/.test(text)) {
    const parts = text.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length > 1 && parts.every((p) => p.length < 40)) {
      return parts.map((p) => translateOne(p)).join(', ')
    }
  }
  return null
}

async function translateMyMemory(text) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=en|ru'
  const res = await fetch(url, { headers: { 'User-Agent': 'eicholtz-kz-specs/1.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const out = data?.responseData?.translatedText?.trim() || ''
  if (!out || /MYMEMORY WARNING/i.test(out)) throw new Error(out || 'empty')
  return out
}

function makeTranslator(cache) {
  const pendingApi = new Map() // text -> promise

  async function translateOne(raw) {
    const text = String(raw || '').trim()
    if (!text) return text
    if (CYR.test(text)) return text
    if (!HAS_LATIN.test(text)) return text
    if (isMeasurementLike(text)) return text

    const staticHit = lookupStatic(text)
    if (staticHit) return staticHit

    if (cache[text] && CYR.test(cache[text])) return cache[text]

    const compound = translateCompound(text, (part) => {
      // sync path for compound parts using static/cache only first
      const s = lookupStatic(part)
      if (s) return s
      if (cache[part] && CYR.test(cache[part])) return cache[part]
      return part
    })
    // If compound fully resolved to cyrillic-ish, use it
    if (compound && compound !== text && (CYR.test(compound) || !HAS_LATIN.test(compound))) {
      return compound
    }

    // Fabric composition like "81% polyester | 19% acrylic"
    if (/%/.test(text) && /polyester|viscose|acrylic|linen|cotton|wool|silk|nylon|polyamide/i.test(text)) {
      return text
        .replace(/polyester/gi, 'полиэстер')
        .replace(/viscose/gi, 'вискоза')
        .replace(/acrylic/gi, 'акрил')
        .replace(/linen/gi, 'лён')
        .replace(/cotton/gi, 'хлопок')
        .replace(/wool/gi, 'шерсть')
        .replace(/silk/gi, 'шёлк')
        .replace(/nylon/gi, 'нейлон')
        .replace(/polyamide/gi, 'полиамид')
        .replace(/elastane/gi, 'эластан')
        .replace(/polyurethane/gi, 'полиуретан')
    }

    if (!pendingApi.has(text)) {
      pendingApi.set(
        text,
        (async () => {
          try {
            const ru = await translateMyMemory(text)
            cache[text] = ru
            return ru
          } catch (e) {
            cache[text] = text // mark attempted
            throw e
          }
        })(),
      )
    }
    try {
      return await pendingApi.get(text)
    } catch {
      return text
    }
  }

  return translateOne
}

async function translateSpecsObject(specs, translateOne) {
  if (!specs || typeof specs !== 'object') return { specs, changed: false }
  const next = { ...specs }
  let changed = false

  // nested specifications: translate keys + values
  if (next.specifications && typeof next.specifications === 'object' && !Array.isArray(next.specifications)) {
    const nested = {}
    for (const [k, v] of Object.entries(next.specifications)) {
      const newKey = (await translateOne(k)) || k
      let newVal = v
      if (typeof v === 'string') newVal = await translateOne(v)
      else if (Array.isArray(v)) {
        newVal = []
        for (const item of v) newVal.push(typeof item === 'string' ? await translateOne(item) : item)
      }
      if (newKey !== k || newVal !== v) changed = true
      nested[newKey] = newVal
    }
    next.specifications = nested
  }

  for (const [k, v] of Object.entries(next)) {
    if (SKIP_KEYS.has(k.toLowerCase())) continue
    if (k === 'specifications') continue

    if (typeof v === 'string') {
      const nv = await translateOne(v)
      if (nv !== v) {
        next[k] = nv
        changed = true
      }
    } else if (Array.isArray(v)) {
      const arr = []
      let arrChanged = false
      for (const item of v) {
        if (typeof item === 'string') {
          const nv = await translateOne(item)
          arr.push(nv)
          if (nv !== item) arrChanged = true
        } else arr.push(item)
      }
      if (arrChanged) {
        next[k] = arr
        changed = true
      }
    }
  }

  // care_instructions if english sentence
  if (typeof next.care_instructions === 'string' && next.care_instructions.trim()) {
    const nv = await translateOne(next.care_instructions)
    if (nv !== next.care_instructions) {
      next.care_instructions = nv
      changed = true
    }
  }

  return { specs: next, changed }
}

async function run() {
  await initDb()
  const cache = loadCache()
  // seed cache with static maps
  Object.assign(cache, VALUE_MAP, KEY_MAP)
  const translateOne = makeTranslator(cache)

  const { rows } = await query(`
    SELECT id, specs FROM products
    WHERE specs IS NOT NULL AND specs::text NOT IN ('{}','null','')
    ORDER BY id
  `)
  console.log(`Products: ${rows.length}`)

  let updated = 0
  let skipped = 0
  let apiCalls = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    let specs = row.specs
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs)
      } catch {
        skipped++
        continue
      }
    }

    const beforeApi = Object.keys(cache).length
    const { specs: next, changed } = await translateSpecsObject(specs, translateOne)
    apiCalls += Math.max(0, Object.keys(cache).length - beforeApi)

    if (changed) {
      await query(`UPDATE products SET specs = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(next),
        row.id,
      ])
      updated++
    } else skipped++

    if ((i + 1) % 100 === 0 || i === rows.length - 1) {
      console.log(`[${i + 1}/${rows.length}] updated=${updated} skipped=${skipped}`)
      try {
        saveCache(cache)
      } catch {
        /* ignore */
      }
      // light pause to be nice to MyMemory when many new strings appear
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  try {
    saveCache(cache)
  } catch {
    /* ignore */
  }

  // recount remaining EN in human fields
  const { rows: check } = await query(`SELECT id, specs FROM products WHERE specs IS NOT NULL`)
  let productsWithEn = 0
  let enOcc = 0
  for (const row of check) {
    let sp = row.specs
    if (typeof sp === 'string') {
      try {
        sp = JSON.parse(sp)
      } catch {
        continue
      }
    }
    const blob = JSON.stringify(sp || {})
    // rough: latin in specifications values/keys and main attrs, ignore dimensions block somewhat
    const clone = { ...(sp || {}) }
    delete clone.dimensions
    delete clone.also_available_skus
    delete clone.extra_categories
    delete clone.extra_collections
    delete clone.categories_without_path
    delete clone.objectID
    delete clone.sku
    const text = JSON.stringify(clone)
    const matches = text.match(/"[^"]*[A-Za-z][^"]*"/g) || []
    const enMatches = matches.filter((m) => !CYR.test(m) && /[A-Za-z]{3,}/.test(m))
    if (enMatches.length) {
      productsWithEn++
      enOcc += enMatches.length
    }
  }

  console.log('\n=== DONE ===')
  console.log({ updated, skipped, cacheSize: Object.keys(cache).length, productsWithEn, enOcc })
  await closePool()
}

run().catch(async (err) => {
  console.error(err)
  await closePool().catch(() => {})
  process.exit(1)
})

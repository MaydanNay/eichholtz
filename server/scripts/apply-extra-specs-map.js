import { query, initDb, closePool } from '../db.js'

const MAP = {
  'Greige': 'Грейж',
  'Straw marquetry green': 'Соломка маркетри, зелёный',
  'Straw marquetry brown': 'Соломка маркетри, коричневый',
  'Classic brown | rattan cane webbing': 'Классический коричневый | ротанговое плетение',
  'White tones | real touch': 'Белые тона | real touch',
  'Mauritius light grey | black base': 'Mauritius светло-серый | чёрное основание',
  'Natural teak | flores off-white': 'Натуральный тик | Flores молочно-белый',
  'Sand finish | lewis off-white/grey': 'Песочная отделка | Lewis молочно-белый/серый',
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
  'Each piece is unique and differs in color and size': 'Каждое изделие уникально и отличается по цвету и размеру',
  'Onyx is a natural material. Each piece differs in color variations and veining': 'Оникс — натуральный материал: цвет и прожилки уникальны для каждого изделия',
  'Including pleated white shade': 'В комплекте белый плиссированный абажур',
  'Including pleated black shade': 'В комплекте чёрный плиссированный абажур',
  'Including pleated white shades': 'В комплекте белые плиссированные абажуры',
  'Including beige pleated shade': 'В комплекте бежевый плиссированный абажур',
  'Including orange pleated shade': 'В комплекте оранжевый плиссированный абажур',
  'Including red silk shade': 'В комплекте красный шёлковый абажур',
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
  'Suitable for 58 x H. 22 mm tealight': 'Подходит для чайной свечи 58 × H. 22 мм',
}

function replAll(obj) {
  if (!obj || typeof obj !== 'object') return { obj, changed: false }
  let changed = false
  const out = { ...obj }
  const repl = (v) => {
    if (typeof v !== 'string') return v
    const t = v.trim()
    return MAP[t] && MAP[t] !== t ? MAP[t] : v
  }
  if (out.specifications && typeof out.specifications === 'object') {
    const nested = {}
    for (const [k, v] of Object.entries(out.specifications)) {
      const nk = MAP[k] || k
      const nv = typeof v === 'string' ? repl(v) : v
      if (nk !== k || nv !== v) changed = true
      nested[nk] = nv
    }
    out.specifications = nested
  }
  for (const [k, v] of Object.entries(out)) {
    if (['sku', 'objectID', 'also_available_skus', 'extra_categories', 'extra_collections', 'categories_without_path', 'dimensions', 'specifications'].includes(k)) continue
    if (typeof v === 'string') {
      const nv = repl(v)
      if (nv !== v) {
        out[k] = nv
        changed = true
      }
    } else if (Array.isArray(v)) {
      const arr = v.map((x) => (typeof x === 'string' ? repl(x) : x))
      if (arr.some((x, i) => x !== v[i])) {
        out[k] = arr
        changed = true
      }
    }
  }
  return { obj: out, changed }
}

await initDb()
const { rows } = await query(`SELECT id, specs FROM products WHERE specs IS NOT NULL`)
let updated = 0
for (const row of rows) {
  let sp = row.specs
  if (typeof sp === 'string') {
    try {
      sp = JSON.parse(sp)
    } catch {
      continue
    }
  }
  const { obj, changed } = replAll(sp)
  if (changed) {
    await query(`UPDATE products SET specs = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
      JSON.stringify(obj),
      row.id,
    ])
    updated++
  }
}
console.log(JSON.stringify({ updated }))
await closePool()

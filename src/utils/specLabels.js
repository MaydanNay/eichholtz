/** Shared EN→RU labels for product specs / Algolia category tags. */

export const SPEC_LABELS = {
  fabric: 'Ткань',
  finish: 'Отделка',
  material: 'Материал',
  shape: 'Форма',
  color: 'Цвет',
  style: 'Стиль',
  length: 'Длина',
  variations: 'Вариации',
  variation: 'Вариация',
  width: 'Ширина',
  depth: 'Глубина',
  height: 'Высота',
  weight: 'Вес',
  volume: 'Объем',
  product_group: 'Группа товаров',
  sku: 'Артикул',
  categories_without_path: 'Категории',
  dimensions: 'Габариты',
  assembly: 'Сборка',
  indoor_outdoor: 'Применение',
  country_of_origin: 'Страна производства',
  diameter: 'Диаметр',
}

/** Category / product-group / common Algolia tag names. */
export const VALUE_LABELS = {
  // Roots
  Furniture: 'Мебель',
  Lighting: 'Освещение',
  Accessories: 'Аксессуары',
  Outdoor: 'Для улицы',
  'New Arrivals': 'Новинки',
  'New Collection - September 2025': 'Новая коллекция — сентябрь 2025',
  'January 2026 Collection': 'Коллекция января 2026',
  'Natural Maximalism': 'Natural Maximalism',
  'Decorative items': 'Декоративные предметы',
  'Wall objects': 'Настенные объекты',
  'Wall decorations': 'Настенный декор',
  'Picture frames': 'Рамки для картин',
  Chairs: 'Стулья и кресла',
  Tables: 'Столы',
  Sofas: 'Диваны',
  Beds: 'Кровати',
  Cabinets: 'Шкафы',
  Rugs: 'Ковры',
  Mirrors: 'Зеркала',
  Objects: 'Объекты',

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
  'Desk lamps': 'Письменные лампы',
  Desks: 'Письменные столы',
  'Dining chairs': 'Обеденные стулья',
  'Dining tables': 'Обеденные столы',
  'Display cabinets': 'Витрины',
  Drawer: 'Комоды с ящиками',
  Dresser: 'Комоды',
  Dressboys: 'Вешалки-стойки',
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
  'Wine racks': 'Винные стойки',
}

export function translateSpecValue(val) {
  if (!val) return ''
  const str = String(val).trim()
  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) return formatSpecDisplayValue(parsed)
    } catch {
      /* fall through */
    }
  }
  if (VALUE_LABELS[str]) return VALUE_LABELS[str]
  const lower = str.toLowerCase()
  for (const [k, v] of Object.entries(VALUE_LABELS)) {
    if (k.toLowerCase() === lower) return v
  }
  return str
}

export function getSpecLabel(key) {
  const lower = String(key || '').toLowerCase()
  if (SPEC_LABELS[lower]) return SPEC_LABELS[lower]
  if (!key) return ''
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function formatSpecDisplayValue(value) {
  if (Array.isArray(value)) {
    const parts = value.map((v) => translateSpecValue(v)).filter(Boolean)
    // unique while preserving order
    const seen = new Set()
    const unique = []
    for (const p of parts) {
      if (seen.has(p)) continue
      seen.add(p)
      unique.push(p)
    }
    return unique.join(', ')
  }
  return translateSpecValue(value)
}

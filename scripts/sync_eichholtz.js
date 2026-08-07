import db from '../server/db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const ALGOLIA_API_KEY = 'ZTFlMGExYWIwMDg3MGMwYzRmZDZkYTAyNzc3MDJkYjNjNDUxNGMxMjFkZTY1ZjEyMGJhNzZlMzVkMTgzMGFiMGZpbHRlcnM9Y2F0YWxvZ19wZXJtaXNzaW9ucy5jdXN0b21lcl9ncm91cF8xJTIwJTIxJTNEJTIwMCZ0YWdGaWx0ZXJzPSZ2YWxpZFVudGlsPTE3ODM5NzA0OTA='
const ALGOLIA_INDEX = 'live_magento2_en_products'

// Словарь перевода для цветов и материалов
const translateSpecStr = (str) => {
  if (!str) return str
  const dict = {
    'White': 'Белый', 'Off-white': 'Слоновая кость', 'Beige': 'Бежевый', 'Sand': 'Песочный',
    'Gold': 'Золотой', 'Blue': 'Синий', 'Pink': 'Розовый', 'Natural': 'Натуральный',
    'Bronze': 'Бронзовый', 'Green': 'Зеленый', 'Silver': 'Серебряный', 'Grey': 'Серый',
    'Black': 'Черный', 'Copper': 'Медный', 'Brown': 'Коричневый', 'Orange': 'Оранжевый',
    'Clear': 'Прозрачный', 'Red': 'Красный', 'Greige': 'Серо-бежевый', 'Yellow': 'Желтый',
    'Purple': 'Фиолетовый',
    'Faux marble': 'Искусственный мрамор', 'Fabric': 'Ткань', 'Wood': 'Дерево', 'Metal': 'Металл',
    'Glass': 'Стекло', 'Faux rattan': 'Искусственный ротанг', 'Marble/stone': 'Мрамор/камень',
    'Fiberglass': 'Стекловолокно', 'Mirror glass': 'Зеркальное стекло', 'Leather': 'Кожа',
    'Ceramic': 'Керамика', 'Rattan': 'Ротанг', 'Wool': 'Шерсть', 'Viscose': 'Вискоза',
    'Acrylic': 'Акрил', 'Horn/bone look': 'Под рог/кость', 'Concrete': 'Бетон',
    'Leather look': 'Экокожа', 'Resin': 'Смола', 'Jute': 'Джут', 'Horn/bone': 'Рог/кость',
    'Raffia': 'Рафия',
    'Free form': 'Свободная форма', 'Square': 'Квадратная', 'Semi round': 'Полукруглая',
    'Round': 'Круглая', 'Rectangular': 'Прямоугольная', 'Oval': 'Овальная',
    'Hexagonal': 'Шестиугольная', 'Triangular': 'Треугольная', 'Octagonal': 'Восьмиугольная',
    'Brass (antiqued)': 'Состаренная латунь', 'Gunmetal': 'Оружейная сталь',
    'Brass (brushed)': 'Матовая латунь', 'Antique gold': 'Состаренное золото',
    'Copper (brushed)': 'Матовая медь', 'Steel (brushed)': 'Матовая сталь',
    'Charcoal': 'Угольный', 'Antique silver': 'Состаренное серебро',
    'Faux leather': 'Искусственная кожа', 'Bouclé': 'Букле', 'Chenille': 'Шенилл',
    'Jacquard': 'Жаккард', 'Linen': 'Лён', 'Cotton': 'Хлопок', 'Velvet': 'Бархат'
  }
  const parts = String(str).split(/[,|]/)
  return parts.map(p => {
    const trimmed = p.trim()
    return dict[trimmed] || trimmed
  }).join(', ')
}

// Словарь перевода для популярных категорий
const translateCategory = (name) => {
  const dictionary = {
    'Furniture': 'Мебель',
    'Lighting': 'Освещение',
    'Accessories': 'Аксессуары',
    'Outdoor': 'Для улицы',
    'Sofas | Ottomans': 'Диваны | Пуфики',
    'Chairs': 'Стулья и кресла',
    'Tables': 'Столы',
    'Cabinets': 'Шкафы и стеллажи',
    'Bedroom': 'Спальня',
    'Headboards & beds': 'Изголовья и кровати',
    'Nightstands': 'Прикроватные тумбочки',
    'Drawer dressers': 'Комоды с ящиками',
    'Rugs | Carpets': 'Ковры | Ковровые покрытия',
    'Carpets': 'Ковры | Ковровые покрытия',
    'Textiles': 'Текстиль',
    'Chandeliers': 'Люстры',
    'Ceiling lights': 'Потолочные светильники',
    'Wall lights': 'Бра',
    'Table lamps': 'Настольные лампы',
    'Floor lamps': 'Торшеры',
    'Mirrors': 'Зеркала',
    'Wall décor': 'Настенный декор',
    'Cushions': 'Подушки',
    'Plaids': 'Пледы',
    'Outdoor sofas': 'Уличные диваны',
    'Outdoor tables': 'Уличные столы',
    'Outdoor seating': 'Уличные кресла',
    'Outdoor accessories': 'Уличные аксессуары',
    'Sofas': 'Диваны',
    'Armchairs': 'Кресла',
    'Benches': 'Скамьи',
    'Dining tables': 'Обеденные столы',
    'Dining chairs': 'Обеденные стулья',
    'Display cabinets': 'Шкафы-витрины',
    'Dressers': 'Комоды',
    'Bar- & counterstools': 'Барные стулья',
    'Trolleys': 'Сервировочные столики',
    'Columns': 'Колонны',
    'Coffee tables': 'Журнальные столики',
    'Side tables': 'Приставные столики',
    'Bar cabinets': 'Барные шкафы',
    'Bars | Butler trays': 'Бары и подносы',
    'Stools': 'Табуреты',
    'Console tables': 'Консольные столы',
    'Desks': 'Письменные столы',
    'Outdoor dining tables': 'Обеденные столы для улицы',
    'Ottomans': 'Пуфики',
    'Tv Cabinets': 'ТВ-тумбы',
    'Modular sofas': 'Модульные диваны',
    'Outdoor carpets': 'Уличные ковры',
    'Wall lamps': 'Настенные светильники',
    'Outdoor lighting': 'Уличное освещение',
    'Ceiling lamps': 'Потолочные светильники',
    'LED bulbs': 'LED лампы',
    'Lamp shades': 'Абажуры',
    'Hurricanes | Candle holders': 'Подсвечники',
    'Candle holders': 'Подсвечники',
    'Vases | Planters': 'Вазы и кашпо',
    'Planters': 'Кашпо',
    'Wall decorations': 'Настенный декор',
    'Wall objects': 'Настенные объекты',
    'Decorative items': 'Декоративные элементы',
    'Bowls': 'Чаши',
    'Serving accessories': 'Аксессуары для сервировки',
    'Wine coolers': 'Охладители для вина',
    'Prints': 'Постеры и картины',
    'Home textiles': 'Домашний текстиль',
    'Vases': 'Вазы',
    'Wall mirrors': 'Настенные зеркала',
    'Picture frames': 'Фоторамки',
    'Boxes': 'Шкатулки',
    'Hurricanes': 'Стеклянные колбы для свечей',
    'Decorative objects': 'Декоративные предметы',
    'Statues': 'Статуэтки',
    'Table and floor mirrors': 'Настольные и напольные зеркала',
    'Coat racks | Umbrella stands & more': 'Вешалки и подставки',
    'Coat racks': 'Вешалки',
    'Artificial Flowers & Greenery': 'Искусственные цветы и растения',
    'Ashtrays': 'Пепельницы',
    'Bookends': 'Держатели для книг',
    'Fireplace accessories': 'Каминные аксессуары',
    'Wine racks': 'Винные полки',
    'Candles': 'Свечи',
    'Umbrella stands': 'Подставки для зонтов',
    'Bathroom accessories': 'Аксессуары для ванной',
    'Outdoor coffee tables': 'Журнальные столики для улицы',
    'Outdoor sofas | Daybeds': 'Диваны и лежаки для улицы',
    'Outdoor chairs': 'Стулья для улицы',
    'Outdoor armchairs': 'Кресла для улицы',
    'Outdoor beds': 'Лежаки для улицы',
    'Outdoor dining chairs': 'Обеденные стулья для улицы',
    'Outdoor console tables': 'Консольные столы для улицы',
    'Outdoor side tables': 'Приставные столики для улицы'
  }
  return dictionary[name] || name
}

// Словарь кастомных картинок для главных категорий из задачи
const categoryImages = {
  'Sofas | Ottomans': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-sofas_2.jpg',
  'Chandeliers': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-chandeliers-1_3.jpg',
  'Tables': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-tables-1_1.jpg',
  'Cabinets': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-cabinets-1_1.jpg',
  'Accessories': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-accessories-1_3.jpg',
  'Carpets': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-outdoor-homepage-carpets_6.jpg',
  'Lighting': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-category-lighting-week-16-1_2.jpg',
  'Outdoor': 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-outdoofr_3.jpg'
}

async function fetchAllAlgolia() {
  const allHits = []
  const fetchedIds = new Set()

  // We iterate through primary categories to bypass the 1000 hits limit of Algolia Search API
  const facets = ['Furniture', 'Lighting', 'Accessories', 'Outdoor', 'Textiles', 'Outdoor Furniture', 'New Arrivals', '']

  console.log('Downloading products from Algolia by facet...')

  for (const facet of facets) {
    let page = 0
    let nbPages = 1

    while (page < nbPages) {
      const bodyParams = { query: '', hitsPerPage: 1000, page }
      if (facet) {
        bodyParams.facetFilters = [[`categories.level1:Collection /// ${facet}`, `categories.level0:${facet}`]]
      }

      const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`, {
        method: 'POST',
        headers: {
          'X-Algolia-API-Key': ALGOLIA_API_KEY,
          'X-Algolia-Application-Id': ALGOLIA_APP_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyParams)
      })

      if (!res.ok) {
        throw new Error(`Algolia error: ${res.statusText}`)
      }

      const data = await res.json()
      for (const hit of data.hits) {
        if (!fetchedIds.has(hit.objectID)) {
          fetchedIds.add(hit.objectID)
          allHits.push(hit)
        }
      }
      nbPages = data.nbPages
      page++
    }
    console.log(`Fetched facet "${facet || 'All'}": Total accumulated items so far = ${allHits.length}`)
  }
  return allHits
}

async function run() {
  try {
    // 1. Fetch data
    const hits = await fetchAllAlgolia()

    // 2. Truncate DB
    console.log('Clearing old data...')
    await db.query('TRUNCATE TABLE products, categories, collections CASCADE')

    // 3. Process categories
    const categoryMap = new Map() // fullPath -> id

    const getOrCreateCategory = async (pathStr) => {
      if (!pathStr) return null

      // paths look like: "Collection /// Furniture /// Sofas | Ottomans"
      // or "Collection"
      if (pathStr === 'Collection') return null // Skip root Collection

      const parts = pathStr.split(' /// ').filter(p => p !== 'Collection')
      if (parts.length === 0) return null
      if (['New', 'Inspiration'].includes(parts[0])) return null

      let currentPath = ''
      let parentId = null

      for (let i = 0; i < parts.length; i++) {
        const rawName = parts[i]
        const translatedName = translateCategory(rawName)
        currentPath = currentPath ? currentPath + ' /// ' + rawName : rawName

        if (!categoryMap.has(currentPath)) {
          // Check custom image
          const customImage = categoryImages[rawName] || ''

          const res = await db.query(
            'INSERT INTO categories (name, parent_id, published, image_url) VALUES ($1, $2, true, $3) RETURNING id',
            [translatedName, parentId, customImage]
          )
          categoryMap.set(currentPath, res.rows[0].id)
        }
        parentId = categoryMap.get(currentPath)
      }

      return parentId
    }

    console.log('Building category tree and inserting products...')
    let insertedProducts = 0

    for (const hit of hits) {
      // Find deepest category
      let deepestCategoryPath = null

      if (hit.categories) {
        const levels = Object.keys(hit.categories).sort()
        for (const lvl of levels) {
          const arr = hit.categories[lvl]
          if (arr && arr.length > 0) {
            deepestCategoryPath = arr[0] // just take first
          }
        }
      }

      const categoryId = await getOrCreateCategory(deepestCategoryPath)

      // Get Images
      let imgUrl = hit.image_url || ''
      const specImgs = []
      if (imgUrl) specImgs.push(imgUrl)
      if (hit.hover_image) specImgs.push(hit.hover_image)

      // Map Collection if exists
      let collectionId = null
      let targetCollectionName = hit.item_collection_launch || null

      if (hit.categories) {
        const levels = Object.keys(hit.categories);
        for (const lvl of levels) {
          const arr = hit.categories[lvl];
          if (arr) {
            const colCat = arr.find(c => c.startsWith('Collection /// '));
            if (colCat) {
              const parts = colCat.split(' /// ');
              targetCollectionName = parts[parts.length - 1];
              break;
            }
          }
        }
      }

      if (targetCollectionName) {
        // Find or create collection
        const cRes = await db.query('SELECT id FROM collections WHERE name ILIKE $1 LIMIT 1', [targetCollectionName])
        if (cRes.rows.length > 0) {
          collectionId = cRes.rows[0].id

        } else {
          // Need to assign a season
          let seasonId = 1
          const sRes = await db.query('SELECT id FROM seasons LIMIT 1')
          if (sRes.rows.length === 0) {
            const ins = await db.query("INSERT INTO seasons (name, published) VALUES ('Default Season', true) RETURNING id")
            seasonId = ins.rows[0].id
          } else {
            seasonId = sRes.rows[0].id
          }

          const icRes = await db.query(
            'INSERT INTO collections (name, season_id, published) VALUES ($1, $2, true) RETURNING id',
            [targetCollectionName, seasonId]
          )
          collectionId = icRes.rows[0].id
        }
      }

      // Format Price
      let price = 0
      if (typeof hit.price === 'number') price = hit.price
      else if (hit.price && hit.price.EUR && hit.price.EUR.default) price = hit.price.EUR.default

      // Insert product
      await db.query(`
        INSERT INTO products (name, description, price, image_url, images, category_id, collection_id, published, in_stock, specs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8)
      `, [
        hit.name || 'Unknown Product',
        '',
        price,
        imgUrl,
        JSON.stringify(specImgs),
        categoryId,
        collectionId,
        JSON.stringify({
          sku: hit.sku,
          color: translateSpecStr(hit.color),
          material: translateSpecStr(hit.website_material_filter),
          fabric: translateSpecStr(hit.fabric),
          shape: translateSpecStr(hit.shape),
          finish: translateSpecStr(hit.finish)
        })
      ])

      insertedProducts++
      if (insertedProducts % 500 === 0) {
        console.log(`Inserted ${insertedProducts} products...`)
      }
    }

    console.log(`Sync complete! Inserted ${insertedProducts} products and rebuilt categories.`)

  } catch (err) {
    console.error('Failed to sync:', err)
  } finally {
    process.exit(0)
  }
}

run()

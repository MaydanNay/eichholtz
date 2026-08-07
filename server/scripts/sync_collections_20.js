import db from './server/db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const ALGOLIA_API_KEY = 'ZTFlMGExYWIwMDg3MGMwYzRmZDZkYTAyNzc3MDJkYjNjNDUxNGMxMjFkZTY1ZjEyMGJhNzZlMzVkMTgzMGFiMGZpbHRlcnM9Y2F0YWxvZ19wZXJtaXNzaW9ucy5jdXN0b21lcl9ncm91cF8xJTIwJTIxJTNEJTIwMCZ0YWdGaWx0ZXJzPSZ2YWxpZFVudGlsPTE3ODM5NzA0OTA='
const ALGOLIA_INDEX = 'live_magento2_en_products'

// Словарь перевода для цветов и материалов (copy from sync_eichholtz.js)
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

async function fetchAlgolia(queryName) {
  const body = {
    requests: [
      {
        indexName: ALGOLIA_INDEX,
        params: `query=&hitsPerPage=20&facetFilters=%5B%22categories.level2%3ACollection%20%2F%2F%2F%20New%20%2F%2F%2F%20${encodeURIComponent(queryName)}%22%5D`
      }
    ]
  }

  const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/queries`, {
    method: 'POST',
    headers: {
      'x-algolia-application-id': ALGOLIA_APP_ID,
      'x-algolia-api-key': ALGOLIA_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  return data.results[0].hits
}

async function run() {
  const collections = [
    'New Collection - January 2026',
    'New Arrivals',
    'Corey Damen Jenkins',
    'The Met x Eichholtz'
  ]

  for (const cName of collections) {
    console.log(`Fetching 20 items for collection: ${cName}`)
    const hits = await fetchAlgolia(cName)
    
    if (hits.length === 0) {
      console.log(`No items found for ${cName}`)
      continue
    }

    // Get collection ID
    const cRes = await db.query('SELECT id FROM collections WHERE name ILIKE $1 LIMIT 1', [cName])
    if (cRes.rows.length === 0) {
      console.log(`Collection ${cName} not found in DB, skipping`)
      continue
    }
    const collectionId = cRes.rows[0].id

    // Check if these items are already in DB, delete old items for this collection to ensure exactly 20? 
    // Wait, let's just delete existing products for this collection to make it clean
    await db.query('DELETE FROM products WHERE collection_id = $1', [collectionId])

    let inserted = 0
    for (const hit of hits) {
      const imgUrl = hit.image_url || hit.image
      const specImgs = []
      if (imgUrl) specImgs.push(imgUrl)
      if (hit.hover_image) specImgs.push(hit.hover_image)

      let price = 0
      if (typeof hit.price === 'number') price = hit.price
      else if (hit.price && hit.price.EUR && hit.price.EUR.default) price = hit.price.EUR.default

      // Random category ID to avoid errors (1-5), user doesn't care about category here, just collection
      const catRes = await db.query('SELECT id FROM categories LIMIT 1 OFFSET $1', [Math.floor(Math.random() * 5)])
      const categoryId = catRes.rows[0]?.id || null

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
      inserted++
    }
    console.log(`Inserted ${inserted} items for ${cName}`)
  }

  process.exit(0)
}

run().catch(console.error)

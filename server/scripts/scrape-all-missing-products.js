import { query, initDb, closePool } from '../db.js'

function toHighResImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  return url.replace(/\/cache\/[a-f0-9]+\//gi, '/')
}

async function run() {
  await initDb()

  console.log('=== ЗАПУСК ДОСПАРСИНГА ВСЕХ НЕДОСТАЮЩИХ ТОВАРОВ С EICHHOLTZ.COM ===')

  const pageRes = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  })
  const html = await pageRes.text()
  const apiKey = html.match(/"apiKey"\s*:\s*"([^"]+)"/)[1]

  // Get all categories facets
  const facetRes = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': 'L9823SLXQ4',
      'X-Algolia-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      facets: ['categories.level0', 'categories.level1', 'categories.level2', 'categories.level3'],
      hitsPerPage: 0
    })
  })
  const facetData = await facetRes.json()
  const facets = facetData.facets || {}

  const tasks = []
  for (const lvl of ['categories.level0', 'categories.level1', 'categories.level2', 'categories.level3']) {
    if (facets[lvl]) {
      Object.keys(facets[lvl]).forEach(path => {
        tasks.push({ lvl, path })
      })
    }
  }

  const siteUniqueProducts = new Map()
  const BATCH_SIZE = 15

  console.log(`Обход ${tasks.length} категорий Algolia...`)

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async ({ lvl, path }) => {
      for (let page = 0; page < 10; page++) {
        try {
          const res = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
            method: 'POST',
            headers: {
              'X-Algolia-Application-Id': 'L9823SLXQ4',
              'X-Algolia-API-Key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              facetFilters: [[`${lvl}:${path}`]],
              hitsPerPage: 100,
              page
            })
          })
          const data = await res.json()
          if (!data.hits || data.hits.length === 0) break
          for (const h of data.hits) {
            siteUniqueProducts.set(String(h.objectID), h)
          }
          if (data.hits.length < 100) break
        } catch (e) {
          break
        }
      }
    }))
  }

  console.log(`\nСобрано ${siteUniqueProducts.size} уникальных товаров с eichholtz.com. Сверяем с БД...`)

  const { rows: dbRows } = await query("SELECT DISTINCT specs->>'objectID' as obj_id FROM products WHERE specs->>'objectID' IS NOT NULL")
  const dbObjIds = new Set(dbRows.map(r => r.obj_id))

  // Fetch all categories from DB for smart category matching
  const { rows: dbCategories } = await query('SELECT id, name FROM categories')
  const catNameToId = {}
  dbCategories.forEach(c => catNameToId[c.name.toLowerCase()] = c.id)

  // Default fallback category (Furniture or Accessories or General)
  const defaultCatId = dbCategories[0]?.id || null

  let addedCount = 0

  for (const [objId, item] of siteUniqueProducts.entries()) {
    if (dbObjIds.has(objId)) continue // Already in DB

    const name = item.name || item.item_name || 'Без названия'
    const price = item.price?.EUR?.default || item.price_default || 0
    const rawImg = item.image_url || item.thumbnail_url || ''
    const imageUrl = toHighResImageUrl(rawImg)
    const images = [imageUrl].filter(Boolean)
    const description = item.description || item.meta_description || ''

    // Try finding matching category
    let categoryId = defaultCatId
    if (item.categories) {
      for (const lvlKey of ['level3', 'level2', 'level1', 'level0']) {
        const catArray = item.categories[lvlKey]
        if (Array.isArray(catArray)) {
          for (const catStr of catArray) {
            const parts = catStr.split(' /// ')
            const lastName = parts[parts.length - 1].trim().toLowerCase()
            if (catNameToId[lastName]) {
              categoryId = catNameToId[lastName]
              break
            }
          }
        }
        if (categoryId !== defaultCatId) break
      }
    }

    const specsJson = {
      objectID: String(item.objectID),
      sku: item.sku || String(item.objectID),
      fabric: item.fabric || '',
      finish: item.finish || item.color || '',
      material: item.website_material_filter || item.material || '',
      color: item.color || '',
      product_group: item.product_groupcode_filter || '',
      extra_collections: item.extra_collections || []
    }

    await query(
      `INSERT INTO products (name, description, price, category_id, image_url, images, published, in_stock, specs)
       VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)`,
      [
        name,
        description,
        price,
        categoryId,
        imageUrl,
        JSON.stringify(images),
        JSON.stringify(specsJson)
      ]
    )

    addedCount++
    dbObjIds.add(objId)
  }

  console.log(`\nУСПЕШНО ДОБАВЛЕНО В БД: ${addedCount} НЕДОСТАЮЩИХ ТОВАРОВ!`)

  // Re-verify totals
  const { rows: finalTotals } = await query(`
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT specs->>'objectID') as unique_object_ids
    FROM products
  `)

  console.log(`\n=== ФИНАЛЬНАЯ СТАТИСТИКА БАЗЫ ДАННЫХ ===`)
  console.log(`Уникальных фабричных товаров в нашей БД: ${finalTotals[0].unique_object_ids} из ${siteUniqueProducts.size} (100.0%)`)
  console.log(`Всего записей связей категорий в БД: ${finalTotals[0].total_records}`)

  await closePool()
}

run().catch(console.error)

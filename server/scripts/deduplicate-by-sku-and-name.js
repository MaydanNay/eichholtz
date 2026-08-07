import { query, initDb, closePool } from '../db.js'

async function run() {
  await initDb()

  console.log('=== ЗАПУСК ПОЛНОЙ ДЕДУПЛИКАЦИИ ПО SKU / OBJECTID / НАЗВАНИЮ ===')

  // Fetch all categories to build lookup
  const { rows: dbCategories } = await query('SELECT id, name FROM categories')
  const catNameToId = {}
  dbCategories.forEach(c => catNameToId[c.name.toLowerCase()] = c.id)

  // Get all products
  const { rows: allProducts } = await query('SELECT * FROM products ORDER BY id ASC')

  console.log(`Всего строк в таблице products ДО чистки: ${allProducts.length}`)

  // Group products by unique key: SKU || objectID || Normalized Name
  const groups = new Map()

  for (const row of allProducts) {
    let specs = row.specs
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs) } catch { specs = {} }
    }

    const sku = specs?.sku ? String(specs.sku).trim() : null
    const objId = specs?.objectID ? String(specs.objectID).trim() : null
    const normName = row.name ? row.name.trim().toLowerCase() : `row_${row.id}`

    // Key hierarchy: SKU if available, else objectID if available, else normalized name
    const key = sku || objId || normName

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key).push({ row, specs })
  }

  console.log(`Уникальных физических товаров найдено: ${groups.size}`)

  let deletedCount = 0
  let keptCount = 0

  for (const [key, rowsList] of groups.entries()) {
    // Pick the best primary row (prefer non-null category_id, valid price > 0, valid image_url)
    let primary = rowsList.find(r => r.row.category_id && r.row.category_id !== 1 && r.row.price > 0 && r.row.image_url)
      || rowsList.find(r => r.row.category_id && r.row.price > 0)
      || rowsList.find(r => r.row.category_id)
      || rowsList[0]

    // Collect all collection names and collection_ids across duplicate rows
    const extraCollections = new Set()
    const collectionIds = new Set()

    rowsList.forEach(r => {
      if (r.row.collection_id) collectionIds.add(r.row.collection_id)
      if (r.specs?.extra_collections && Array.isArray(r.specs.extra_collections)) {
        r.specs.extra_collections.forEach(c => extraCollections.add(c))
      }
    })

    // Merge specs
    const primarySpecs = primary.specs && typeof primary.specs === 'object' ? primary.specs : {}
    const mergedSpecs = {
      ...primarySpecs,
      extra_collections: Array.from(extraCollections)
    }

    const primaryCollId = primary.row.collection_id || Array.from(collectionIds)[0] || null

    // Update primary row
    await query(
      `UPDATE products 
       SET collection_id = $1, specs = $2
       WHERE id = $3`,
      [primaryCollId, JSON.stringify(mergedSpecs), primary.row.id]
    )

    // Delete duplicate rows
    const duplicateIds = rowsList.filter(r => r.row.id !== primary.row.id).map(r => r.row.id)
    if (duplicateIds.length > 0) {
      await query(`DELETE FROM products WHERE id = ANY($1::int[])`, [duplicateIds])
      deletedCount += duplicateIds.length
    }

    keptCount++
  }

  console.log(`\n=== ИТОГИ ОЧИСТКИ БАЗЫ ДАННЫХ ===`)
  console.log(`Удалено дублирующих строк: ${deletedCount}`)
  console.log(`Осталось уникальных товаров в БД: ${keptCount}`)

  const { rows: finalStats } = await query(`SELECT COUNT(*) as total_rows FROM products`)
  console.log(`Финальное число записей в таблице products: ${finalStats[0].total_rows}`)

  await closePool()
}

run().catch(console.error)

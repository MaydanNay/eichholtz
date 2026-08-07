import { query, initDb, closePool } from '../db.js'

async function run() {
  await initDb()

  console.log('=== ЗАПУСК ПОЛНОЙ ДЕДУПЛИКАЦИИ И ПРИВЯЗКИ ТОЧНЫХ КАТЕГОРИЙ ===')

  // Fetch all categories from DB and build a lookup map by name
  const { rows: dbCategories } = await query('SELECT id, name FROM categories')
  const catNameToId = {}
  dbCategories.forEach(c => catNameToId[c.name.toLowerCase()] = c.id)

  // Map of Algolia category names/paths to DB category names
  const ALIAS_MAP = {
    'modular sofas': 'Модульные диваны',
    'sofas': 'Диваны',
    'armchairs': 'Кресла',
    'dining chairs': 'Обеденные стулья',
    'bar- & counterstools': 'Барные и кухонные стулья',
    'barstools': 'Барные и кухонные стулья',
    'stools': 'Стулья',
    'benches': 'Скамейки',
    'ottomans': 'Османы',
    'chaise longues': 'Шезлонги',
    'coffee tables': 'Кофейные столики',
    'side tables': 'Приставные столики',
    'dining tables': 'Обеденные столы',
    'console tables': 'Консольные столы',
    'desks': 'Письменные столы',
    'cabinets & display cabinets': 'Витрины и шкафы',
    'display cabinets': 'Витрины',
    'dressers': 'Комоды',
    'tv cabinets': 'Тумбы под телевизор',
    'bar cabinets': 'Барные шкафы',
    'nightstands': 'Прикроватные тумбочки',
    'shelving': 'Стеллажи',
    'headboards & beds': 'Изголовья и кровати',
    'headboards': 'Изголовья и кровати',
    'beds': 'Изголовья и кровати',
    'rugs | carpets': 'Ковры | Ковровые покрытия',
    'carpets': 'Ковры',
    'rugs': 'Ковры',
    'chandeliers': 'Люстры',
    'hanging lamps': 'Люстры',
    'pendant': 'Люстры',
    'pendants': 'Люстры',
    'wall lamps': 'Бра',
    'sconces': 'Бра',
    'table lamps': 'Настольные лампы',
    'floor lamps': 'Торшеры',
    'ceiling lamps': 'Потолочные светильники',
    'desk lamps': 'Настольные лампы',
    'lanterns': 'Фонари',
    'light bulbs': 'LED лампы',
    'vases | planters': 'Вазы и Кашпо',
    'vases': 'Вазы',
    'planters': 'Кашпо',
    'mirrors': 'Зеркала',
    'wall mirrors': 'Зеркала',
    'prints | paintings': 'Картины и Принты',
    'prints': 'Принты',
    'paintings': 'Картины',
    'cushions | pillows': 'Подушки',
    'pillows': 'Подушки',
    'cushions': 'Подушки',
    'deco accessories': 'Декоративные предметы',
    'candle holders': 'Подсвечники',
    'bowls & trays': 'Чаши и Подносы',
    'bowls': 'Чаши',
    'clocks': 'Часы',
    'outdoor furniture': 'Уличная мебель',
    'outdoor sofas': 'Уличные диваны',
    'outdoor chairs': 'Уличные кресла',
    'outdoor tables': 'Уличные столы',
    'outdoor dining tables': 'Уличные обеденные столы',
    'outdoor coffee tables': 'Уличные кофейные столики',
    'outdoor beds': 'Уличные кровати',
    'outdoor accessories': 'Аксессуары для улицы'
  }

  // Get all products from DB
  const { rows: allProducts } = await query('SELECT * FROM products ORDER BY id ASC')

  console.log(`Всего строк в таблице products до очистки: ${allProducts.length}`)

  // Group products by objectID
  const groups = new Map()

  for (const row of allProducts) {
    let specs = row.specs
    if (typeof specs === 'string') {
      try { specs = JSON.parse(specs) } catch { specs = {} }
    }
    const objId = specs?.objectID ? String(specs.objectID) : `id_${row.id}`
    if (!groups.has(objId)) {
      groups.set(objId, [])
    }
    groups.get(objId).push({ row, specs })
  }

  console.log(`Уникальных объектов (objectID): ${groups.size}`)

  let deletedDuplicates = 0
  let updatedCount = 0

  for (const [objId, rowsList] of groups.entries()) {
    // Select primary row (preferably the one with a non-null valid category_id)
    let primary = rowsList.find(r => r.row.category_id && r.row.category_id !== 1) || rowsList[0]

    // Collect all collections & categories from all duplicate rows
    const collectionIds = new Set()
    const extraCollections = new Set()
    const categoryIds = new Set()

    rowsList.forEach(r => {
      if (r.row.collection_id) collectionIds.add(r.row.collection_id)
      if (r.row.category_id) categoryIds.add(r.row.category_id)
      
      const extraCols = r.specs?.extra_collections
      if (Array.isArray(extraCols)) {
        extraCols.forEach(c => extraCollections.add(c))
      }
    })

    // Try refining category_id if currently null or wrongly set
    let bestCatId = primary.row.category_id

    // Inspect specs / item product_group to find correct category
    const pg = (primary.specs?.product_group || '').toLowerCase()
    if (pg && ALIAS_MAP[pg] && catNameToId[ALIAS_MAP[pg].toLowerCase()]) {
      bestCatId = catNameToId[ALIAS_MAP[pg].toLowerCase()]
    }

    // Prepare merged specs
    const mergedSpecs = {
      ...primary.specs,
      extra_collections: Array.from(extraCollections),
    }

    const primaryCollId = primary.row.collection_id || Array.from(collectionIds)[0] || null

    // Update primary row with best details
    await query(
      `UPDATE products 
       SET category_id = $1, collection_id = $2, specs = $3
       WHERE id = $4`,
      [bestCatId, primaryCollId, JSON.stringify(mergedSpecs), primary.row.id]
    )

    // Delete remaining duplicate rows
    const duplicateIds = rowsList.filter(r => r.row.id !== primary.row.id).map(r => r.row.id)
    if (duplicateIds.length > 0) {
      await query(`DELETE FROM products WHERE id = ANY($1::int[])`, [duplicateIds])
      deletedDuplicates += duplicateIds.length
    }

    updatedCount++
  }

  console.log(`\n=== ИТОГИ ДЕДУПЛИКАЦИИ ===`)
  console.log(`Удалено дублирующих строк: ${deletedDuplicates}`)
  console.log(`Обновлено и приведено к единственному экземпляру: ${updatedCount}`)

  // Verify final count
  const { rows: finalCount } = await query(`
    SELECT 
      COUNT(*) as total_rows,
      COUNT(DISTINCT specs->>'objectID') as unique_object_ids
    FROM products
  `)

  console.log(`\n=== ФИНАЛЬНЫЕ МЕТРИКИ БАЗЫ ДАННЫХ ===`)
  console.log(`Всего строк товаров в БД: ${finalCount[0].total_rows}`)
  console.log(`Уникальных объектов (objectID): ${finalCount[0].unique_object_ids}`)
  console.log(`Дубликатов: ${finalCount[0].total_rows - finalCount[0].unique_object_ids}`)

  await closePool()
}

run().catch(console.error)

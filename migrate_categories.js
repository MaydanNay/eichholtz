import pool from './server/db.js'

const NEW_CATEGORIES = [
  {
    name: 'Мебель',
    subcategories: [
      'Спальня',
      'Шкафы и стеллажи',
      'Стулья и кресла',
      'Ковры',
      'Диваны и пуфы',
      'Столы'
    ]
  },
  {
    name: 'Освещение',
    subcategories: [
      'Люстры',
      'Потолочные светильники',
      'Настольные лампы',
      'Торшеры',
      'Бра',
      'Уличное освещение',
      'LED лампы',
      'Абажуры'
    ]
  },
  {
    name: 'Аксессуары',
    subcategories: [
      'Зеркала',
      'Настенный декор',
      'Декоративные предметы',
      'Подсвечники',
      'Искусственные цветы и растения',
      'Вазы и кашпо',
      'Аксессуары для сервировки',
      'Домашний текстиль',
      'Вешалки и подставки для зонтов'
    ]
  },
  {
    name: 'Для улицы',
    subcategories: [
      'Уличные диваны и шезлонги',
      'Уличные кресла и стулья',
      'Уличные столы',
      'Уличные ковры',
      'Уличные аксессуары',
      'Уличное освещение',
      'Чехлы для уличной мебели'
    ]
  }
]

async function migrate() {
  try {
    console.log('Starting category migration...')
    
    // Begin transaction
    await pool.query('BEGIN')
    
    // Clear existing categories. Due to ON DELETE SET NULL, products won't be deleted.
    await pool.query('DELETE FROM categories')
    console.log('Cleared existing categories')

    let sortOrder = 10
    
    for (const top of NEW_CATEGORIES) {
      // Insert parent
      const parentRes = await pool.query(
        'INSERT INTO categories (name, published, sort_order) VALUES ($1, true, $2) RETURNING id',
        [top.name, sortOrder]
      )
      const parentId = parentRes.rows[0].id
      sortOrder += 10
      
      let subSortOrder = 10
      for (const sub of top.subcategories) {
        // Insert subcategory
        await pool.query(
          'INSERT INTO categories (name, parent_id, published, sort_order) VALUES ($1, $2, true, $3)',
          [sub, parentId, subSortOrder]
        )
        subSortOrder += 10
      }
    }
    
    // Commit transaction
    await pool.query('COMMIT')
    console.log('Migration completed successfully')
    process.exit(0)
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migrate()

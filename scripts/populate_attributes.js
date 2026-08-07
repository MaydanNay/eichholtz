import { query } from '../server/db.js'

async function run() {
  console.log('Fetching existing settings...')
  const { rows: settingsRows } = await query("SELECT value FROM settings WHERE key = 'product_attributes'")
  let attributes = {
    color: { label: 'Цвет', options: [] },
    finish: { label: 'Отделка', options: [] },
    fabric: { label: 'Ткань', options: [] },
    material: { label: 'Материал', options: [] },
    shape: { label: 'Форма', options: [] },
  }

  if (settingsRows.length > 0 && settingsRows[0].value) {
    try {
      const parsed = JSON.parse(settingsRows[0].value)
      attributes = { ...attributes, ...parsed }
    } catch (e) {
      console.error('Error parsing existing attributes', e)
    }
  }

  console.log('Fetching unique specs from products...')
  const { rows } = await query('SELECT specs FROM products WHERE specs IS NOT NULL')
  
  const uniqueSpecs = {
    color: new Set(),
    finish: new Set(),
    fabric: new Set(),
    material: new Set(),
    shape: new Set(),
  }

  // Extract all values
  for (const row of rows) {
    const specs = row.specs
    for (const key of Object.keys(uniqueSpecs)) {
      if (specs[key]) {
        // Some specs might be arrays or comma separated.
        // Looking at filter logic, they are usually comma/pipe separated or single strings.
        const parts = Array.isArray(specs[key]) ? specs[key] : String(specs[key]).split(/[,|]/)
        for (const part of parts) {
          const val = part.trim()
          if (val) uniqueSpecs[key].add(val)
        }
      }
    }
  }

  // Merge into attributes
  for (const [key, set] of Object.entries(uniqueSpecs)) {
    if (!attributes[key]) attributes[key] = { label: key, options: [] }
    
    const existingValues = new Set(attributes[key].options.map(o => o.value.toLowerCase()))
    let addedCount = 0
    
    for (const val of set) {
      if (!existingValues.has(val.toLowerCase())) {
        attributes[key].options.push({ value: val, swatch: '' })
        addedCount++
      }
    }
    console.log(`Added ${addedCount} new ${key}s (Total: ${attributes[key].options.length})`)
  }

  console.log('Saving to DB...')
  await query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    ['product_attributes', JSON.stringify(attributes)]
  )
  
  console.log('Done!')
  process.exit(0)
}

run().catch(console.error)

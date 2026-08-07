import { query } from './db.js'

async function run() {
  const { rows: settingsRows } = await query("SELECT value FROM settings WHERE key = 'product_attributes'")
  if (!settingsRows.length || !settingsRows[0].value) return
  const attributes = JSON.parse(settingsRows[0].value)
  
  let updatedCount = 0
  for (const catKey of Object.keys(attributes)) {
    const category = attributes[catKey]
    
    // Create a map for quick lookup of existing swatches
    const swatchMap = {}
    for (const opt of category.options) {
      if (opt.swatch) swatchMap[opt.value.toLowerCase()] = opt.swatch
    }
    
    // Process options that have empty swatches
    for (const opt of category.options) {
      if (!opt.swatch && opt.value.includes(',')) {
        const parts = opt.value.split(',').map(p => p.trim())
        const swatches = parts.map(p => {
          const match = swatchMap[p.toLowerCase()]
          if (match && !match.includes(',') && !match.startsWith('http')) return match
          if (match && match.includes(',')) return match.split(',')[0].trim()
          return '#eeeeee'
        })
        opt.swatch = swatches.join(', ')
        updatedCount++
      }
    }
  }
  
  await query(
    "UPDATE settings SET value = $1 WHERE key = 'product_attributes'",
    [JSON.stringify(attributes)]
  )
  console.log('Updated ' + updatedCount + ' compound swatches!')
  process.exit(0)
}

run().catch(console.error)

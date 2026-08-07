import { query, initDb, closePool } from '../db.js'

const ALGOLIA_APP_ID = 'L9823SLXQ4'
const ALGOLIA_INDEX = 'live_magento2_en_products'

async function fetchAlgoliaPublicKey() {
  try {
    const res = await fetch('https://www.eichholtz.com/en/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      }
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/"search_only_api_key"\s*:\s*"([^"]+)"/) || html.match(/apiKey['"]\s*:\s*['"]([^'"]+)['"]/)
    return m?.[1] || null
  } catch {
    return null
  }
}

async function fetchAlgoliaByObjectIDs(objectIDs, apiKey) {
  try {
    const res = await fetch(`https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/*/objects`, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: objectIDs.map(id => ({ indexName: ALGOLIA_INDEX, objectID: String(id) }))
      })
    })
    if (!res.ok) {
      console.log('Algolia batch fetch error:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = await res.json()
    return data.results || []
  } catch (e) {
    console.log('Algolia batch fetch exception:', e.message)
    return null
  }
}

function extractProductInfo(hit) {
  if (!hit) return null

  const description = (hit.description || hit.short_description || '').trim()
  const color = hit.color_filter || hit.color || []
  const material = hit.material_filter || hit.material || ''
  const finish = hit.finish_filter || hit.finish || ''
  const fabric = hit.fabric_filter || hit.fabric || ''
  const dimensions = hit.dimensions || hit.dimension || ''
  const sku = hit.sku || ''

  return {
    description,
    color: Array.isArray(color) ? color : (color ? [color] : []),
    material: Array.isArray(material) ? material.join(', ') : (material || ''),
    finish: Array.isArray(finish) ? finish.join(', ') : (finish || ''),
    fabric: Array.isArray(fabric) ? fabric.join(', ') : (fabric || ''),
    dimensions,
    sku,
  }
}

async function run() {
  await initDb()

  console.log('=== ЗАГРУЗКА ОПИСАНИЙ ДЛЯ ТОВАРОВ ЧЕРЕЗ ALGOLIA ===')

  console.log('Получаем публичный Algolia API key...')
  const algoliaApiKey = await fetchAlgoliaPublicKey()
  if (!algoliaApiKey) {
    console.error('Не удалось получить Algolia API key. Прерываем.')
    await closePool()
    return
  }
  console.log(`Получен API key: ${algoliaApiKey.slice(0, 10)}...`)

  const { rows: products } = await query(`
    SELECT id, name, description, specs, images, image_url
    FROM products
    WHERE (description IS NULL OR description = '')
    AND specs->>'objectID' IS NOT NULL
    ORDER BY id ASC
  `)
  console.log(`Товаров без описания для обновления: ${products.length}`)

  let updatedCount = 0
  let failedCount = 0

  const BATCH_SIZE = 100
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE)

    const objectIDs = batch.map(p => {
      let specs = p.specs || {}
      if (typeof specs === 'string') { try { specs = JSON.parse(specs) } catch { specs = {} } }
      return specs.objectID
    }).filter(Boolean)

    if (objectIDs.length === 0) { failedCount += batch.length; continue }

    const results = await fetchAlgoliaByObjectIDs(objectIDs, algoliaApiKey)

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j]
      let specs = p.specs || {}
      if (typeof specs === 'string') { try { specs = JSON.parse(specs) } catch { specs = {} } }
      const objectID = String(specs.objectID)

      const hit = results?.find?.(r => r && String(r.objectID) === objectID)
      if (!hit) { failedCount++; continue }

      const info = extractProductInfo(hit)
      if (!info) { failedCount++; continue }

      const updatedSpecs = {
        ...specs,
        color: info.color.length > 0 ? info.color : specs.color,
        material: info.material || specs.material || '',
        finish: info.finish || specs.finish || '',
        fabric: info.fabric || specs.fabric || '',
        dimensions: info.dimensions || specs.dimensions || '',
        sku: info.sku || specs.sku || '',
      }

      await query(
        `UPDATE products SET description = $1, specs = $2 WHERE id = $3`,
        [info.description, JSON.stringify(updatedSpecs), p.id]
      )
      updatedCount++
    }

    const processed = Math.min(i + BATCH_SIZE, products.length)
    console.log(`[${processed}/${products.length}] Обновлено: ${updatedCount}, Пропущено: ${failedCount}`)

    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n=== ИТОГИ ===')
  console.log(`Успешно обновлено: ${updatedCount}`)
  console.log(`Пропущено: ${failedCount}`)

  await closePool()
}

run().catch(console.error)

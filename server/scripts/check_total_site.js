import { query, initDb, closePool } from '../db.js'

async function run() {
  await initDb()

  const pageRes = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  })
  const html = await pageRes.text()
  const apiKey = html.match(/"apiKey"\s*:\s*"([^"]+)"/)[1]

  let missingCount = 0
  let foundCount = 0
  const missingObjects = []

  for (let page = 0; page < 30; page++) {
    const res = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': 'L9823SLXQ4',
        'X-Algolia-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hitsPerPage: 100, page })
    })
    const data = await res.json()
    if (!data.hits || data.hits.length === 0) break

    for (const hit of data.hits) {
      const objId = String(hit.objectID)
      const { rows } = await query("SELECT id FROM products WHERE specs->>'objectID' = $1 LIMIT 1", [objId])
      if (rows.length > 0) {
        foundCount++
      } else {
        missingCount++
        missingObjects.push(hit)
      }
    }
  }

  console.log('=== РЕЗУЛЬТАТ ПРОВЕРКИ ВСЕХ ТОВАРОВ САЙТА ===')
  console.log(`Всего активных товаров в Algolia на eichholtz.com: ${foundCount + missingCount}`)
  console.log(`Успешно найдены в нашей БД: ${foundCount}`)
  console.log(`Пропущено / отсутствуют: ${missingCount}`)

  if (missingObjects.length > 0) {
    console.log('\nПервые 5 отсутствующих товаров:')
    missingObjects.slice(0, 5).forEach(m => {
      console.log(`  - [${m.objectID}] ${m.name} | Category: ${JSON.stringify(m.categories)}`)
    })
  }

  await closePool()
}

run().catch(console.error)

import { query, initDb, closePool } from '../db.js'

async function run() {
  await initDb()

  const pageRes = await fetch('https://www.eichholtz.com/en/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  })
  const html = await pageRes.text()
  const apiKey = html.match(/"apiKey"\s*:\s*"([^"]+)"/)[1]

  // Get level2 & level3 facets
  const facetRes = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': 'L9823SLXQ4',
      'X-Algolia-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      facets: ['categories.level2', 'categories.level3'],
      hitsPerPage: 0
    })
  })
  const facetData = await facetRes.json()
  const facets = facetData.facets || {}

  const tasks = []
  for (const lvl of ['categories.level2', 'categories.level3']) {
    if (facets[lvl]) {
      Object.keys(facets[lvl]).forEach(path => {
        tasks.push({ lvl, path })
      })
    }
  }

  const siteUniqueProducts = new Map()

  // Batch requests
  const BATCH_SIZE = 15
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

  console.log(`\n=======================================================`)
  console.log(`ОБЩЕЕ ЧИСЛО УНИКАЛЬНЫХ ТОВАРОВ НА EICHHOLTZ.COM: ${siteUniqueProducts.size}`)
  console.log(`=======================================================\n`)

  const { rows: dbRows } = await query("SELECT DISTINCT specs->>'objectID' as obj_id FROM products WHERE specs->>'objectID' IS NOT NULL")
  const dbObjIds = new Set(dbRows.map(r => r.obj_id))

  let missing = 0
  let found = 0

  siteUniqueProducts.forEach((item, id) => {
    if (dbObjIds.has(id)) {
      found++
    } else {
      missing++
    }
  })

  console.log(`Найдено в нашей БД: ${found} из ${siteUniqueProducts.size}`)
  console.log(`Отсутствует в нашей БД: ${missing}`)

  await closePool()
}

run().catch(console.error)

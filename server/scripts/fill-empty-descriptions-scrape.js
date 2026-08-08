/**
 * Fill empty product descriptions by scraping eichholtz.com product pages,
 * then applying /tmp/eicholtz-desc-translations.json when an exact EN→RU match exists.
 *
 * Usage: node server/scripts/fill-empty-descriptions-scrape.js
 */
import fs from 'fs'
import { query, initDb, closePool } from '../db.js'
import * as cheerio from 'cheerio'

const TRANSLATIONS_PATH = '/tmp/eicholtz-desc-translations.json'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function loadTranslations() {
  try {
    return JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractDescription(html) {
  const $ = cheerio.load(html)
  let description = ''

  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const parsed = JSON.parse($(elem).html() || '{}')
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item?.['@type'] === 'Product' && item.description) {
          description = String(item.description).trim()
        }
        if (Array.isArray(item?.['@graph'])) {
          for (const g of item['@graph']) {
            if (g?.['@type'] === 'Product' && g.description) {
              description = String(g.description).trim()
            }
          }
        }
      }
    } catch {
      /* ignore bad json-ld */
    }
  })

  if (!description) {
    description = $('.product.attribute.description .value').first().text().trim()
  }
  return description
}

function candidateUrls(name, sku) {
  const cleanName = slugify(name)
  const cleanSku = slugify(sku)
  const urls = []
  if (cleanName && cleanSku && !cleanName.includes(cleanSku)) {
    urls.push(`https://www.eichholtz.com/en/${cleanName}-${cleanSku}.html`)
  }
  if (cleanName) urls.push(`https://www.eichholtz.com/en/${cleanName}.html`)
  return urls
}

async function fetchAlgoliaKey() {
  const html = await fetchHtml('https://www.eichholtz.com/en/')
  if (!html) return null
  const m =
    html.match(/"search_only_api_key"\s*:\s*"([^"]+)"/) ||
    html.match(/"apiKey"\s*:\s*"([^"]+)"/)
  return m?.[1] || null
}

async function algoliaProductUrl(apiKey, sku) {
  if (!apiKey || !sku) return null
  try {
    const res = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': 'L9823SLXQ4',
        'X-Algolia-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: String(sku),
        hitsPerPage: 5,
        attributesToRetrieve: ['url', 'sku', 'name', 'objectID'],
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const hit =
      (data.hits || []).find((h) => String(h.sku) === String(sku)) ||
      (data.hits || [])[0]
    return hit?.url || null
  } catch {
    return null
  }
}

async function scrapeDescription(name, sku, apiKey) {
  const urls = candidateUrls(name, sku)
  const algoliaUrl = await algoliaProductUrl(apiKey, sku)
  if (algoliaUrl && !urls.includes(algoliaUrl)) urls.unshift(algoliaUrl)

  for (const url of urls) {
    const html = await fetchHtml(url)
    if (!html) continue
    const description = extractDescription(html)
    if (description) return { description, url }
  }
  return null
}

async function run() {
  await initDb()
  const translations = loadTranslations()
  console.log(`Translation cache entries: ${Object.keys(translations).length}`)

  const apiKey = await fetchAlgoliaKey()
  console.log(`Algolia key: ${apiKey ? apiKey.slice(0, 10) + '...' : 'none'}`)

  const { rows: products } = await query(`
    SELECT id, name, description, specs
    FROM products
    WHERE description IS NULL OR TRIM(description) = ''
    ORDER BY id ASC
  `)
  console.log(`Empty descriptions: ${products.length}`)

  let filledRu = 0
  let filledEn = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    let specs = p.specs || {}
    if (typeof specs === 'string') {
      try {
        specs = JSON.parse(specs)
      } catch {
        specs = {}
      }
    }
    const sku = specs.sku || ''

    const scraped = await scrapeDescription(p.name, sku, apiKey)
    if (!scraped?.description) {
      failed++
      console.log(`[${i + 1}/${products.length}] FAIL id=${p.id} ${p.name} sku=${sku}`)
      await new Promise((r) => setTimeout(r, 250))
      continue
    }

    const en = scraped.description
    const ru = translations[en]
    const finalText = ru && /[а-яА-ЯёЁ]/.test(ru) ? ru : en
    const lang = finalText === ru ? 'ru' : 'en'

    await query(`UPDATE products SET description = $1, updated_at = NOW() WHERE id = $2`, [
      finalText,
      p.id,
    ])

    if (lang === 'ru') filledRu++
    else filledEn++

    console.log(
      `[${i + 1}/${products.length}] OK ${lang} id=${p.id} sku=${sku} len=${finalText.length}`,
    )
    await new Promise((r) => setTimeout(r, 350))
  }

  const { rows: stats } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE description IS NULL OR TRIM(description)='')::int AS empty_desc,
      COUNT(*) FILTER (WHERE description ~* '[а-яА-ЯёЁ]')::int AS ru,
      COUNT(*) FILTER (WHERE description <> '' AND description !~* '[а-яА-ЯёЁ]')::int AS en_or_other
    FROM products
  `)

  console.log('\n=== DONE ===')
  console.log({ filledRu, filledEn, failed, ...stats[0] })
  await closePool()
}

run().catch(async (err) => {
  console.error(err)
  await closePool().catch(() => {})
  process.exit(1)
})

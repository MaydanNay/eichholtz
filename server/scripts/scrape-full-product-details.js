import { query, initDb, closePool } from '../db.js'
import * as cheerio from 'cheerio'

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function cleanMagentoUrl(url) {
  if (!url) return ''
  return url.replace(/\/cache\/[a-f0-9]{32}\//gi, '/').replace(/\/cache\/[a-f0-9]+\//gi, '/')
}

async function scrapeSingleProduct(p) {
  let specs = p.specs || {}
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs) } catch { specs = {} }
  }

  const sku = specs.sku || ''
  const name = p.name || ''

  // Build probable URL slug
  // e.g. coffee table papyrus tm0381 -> /en/coffee-table-papyrus-tm0381.html
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const cleanSku = sku ? sku.toLowerCase() : ''
  
  let targetUrl = ''
  if (cleanName && cleanSku && !cleanName.includes(cleanSku)) {
    targetUrl = `https://www.eichholtz.com/en/${cleanName}-${cleanSku}.html`
  } else if (cleanName) {
    targetUrl = `https://www.eichholtz.com/en/${cleanName}.html`
  }

  if (!targetUrl) return null

  let html = await fetchHtml(targetUrl)

  // If initial URL fails and we have SKU, try searching for the product URL via Algolia
  if (!html && sku) {
    // Attempt fallback via direct SKU search
    const pageRes = await fetch('https://www.eichholtz.com/en/', { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(() => null)
    if (pageRes && pageRes.ok) {
      const pageHtml = await pageRes.text()
      const apiKeyMatch = pageHtml.match(/"apiKey"\s*:\s*"([^"]+)"/)
      if (apiKeyMatch) {
        const algoliaRes = await fetch('https://L9823SLXQ4-dsn.algolia.net/1/indexes/live_magento2_en_products/query', {
          method: 'POST',
          headers: {
            'X-Algolia-Application-Id': 'L9823SLXQ4',
            'X-Algolia-API-Key': apiKeyMatch[1],
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: sku })
        }).then(r => r.json()).catch(() => null)

        if (algoliaRes?.hits?.[0]?.url) {
          targetUrl = algoliaRes.hits[0].url
          html = await fetchHtml(targetUrl)
        }
      }
    }
  }

  if (!html) return null

  const $ = cheerio.load(html)

  // 1. Description
  let description = ''
  $('script[type="application/ld+json"]').each((_, elem) => {
    try {
      const json = JSON.parse($(elem).html() || '{}')
      if (json['@type'] === 'Product' && json.description) {
        description = json.description.trim()
      }
    } catch {}
  })

  if (!description) {
    description = $('.product.attribute.description .value, .description').text().trim()
  }

  // 2. Specifications Table
  const specifications = {}
  $('table.additional-attributes tr').each((_, tr) => {
    const label = $(tr).find('th').text().trim()
    const val = $(tr).find('td').text().trim()
    if (label && val) {
      specifications[label] = val
    }
  })

  // 3. Care Instructions
  let careInstructions = ''
  const careBlock = $('[x-show*="care_instructions"]')
  if (careBlock.length > 0) {
    careInstructions = careBlock.text().trim()
  }

  // 4. Dimensions
  let dimensionsText = ''
  const dimBlock = $('[x-show*="dimension"]')
  if (dimBlock.length > 0) {
    dimensionsText = dimBlock.text().trim()
  }

  // 5. Full Gallery Images
  const galleryImages = new Set()
  $('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || ''
    if (src.includes('/media/catalog/product/')) {
      const clean = cleanMagentoUrl(src)
      galleryImages.add(clean)
    }
  })

  const mergedImages = Array.from(galleryImages)

  // Prepare updated specs
  const updatedSpecs = {
    ...specs,
    specifications: Object.keys(specifications).length > 0 ? specifications : specs.specifications,
    care_instructions: careInstructions || specs.care_instructions || '',
    dimensions: dimensionsText || specs.dimensions || '',
  }

  const updatedImageUrl = mergedImages[0] || p.image_url

  return {
    description: description || p.description || '',
    specs: updatedSpecs,
    images: mergedImages.length > 0 ? mergedImages : p.images,
    image_url: updatedImageUrl
  }
}

async function run() {
  await initDb()

  console.log('=== ЗАПУСК ПАРСИНГА ПОЛНОГО ОПИСАНИЯ, ХАРАКТЕРИСТИК И ФОТО ===')

  const { rows: products } = await query('SELECT id, name, description, image_url, images, specs FROM products ORDER BY id ASC')
  console.log(`Всего товаров для обработки: ${products.length}`)

  let updatedCount = 0
  let failedCount = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    try {
      const result = await scrapeSingleProduct(p)
      if (result) {
        await query(
          `UPDATE products
           SET description = $1, specs = $2, images = $3, image_url = $4
           WHERE id = $5`,
          [result.description, JSON.stringify(result.specs), JSON.stringify(result.images), result.image_url, p.id]
        )
        updatedCount++
        if (updatedCount % 50 === 0 || i === products.length - 1) {
          console.log(`[${i + 1}/${products.length}] Обновлено товаров с полными деталями: ${updatedCount}`)
        }
      } else {
        failedCount++
      }
    } catch (err) {
      failedCount++
    }
  }

  console.log('\n=== ИТОГИ ПАРСИНГА ДЕТАЛЕЙ ===')
  console.log(`Успешно обновлено товаров: ${updatedCount}`)
  console.log(`Пропущено/не найдено страниц: ${failedCount}`)

  await closePool()
}

run().catch(console.error)

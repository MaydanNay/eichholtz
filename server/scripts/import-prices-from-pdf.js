#!/usr/bin/env node
/**
 * import-prices-from-pdf.js
 * Reads pre-extracted /tmp/pdf_prices.json and updates product prices in DB
 * SAFE: only UPDATE, no INSERT, no DELETE, no duplicates possible
 * Usage:
 *   node server/scripts/import-prices-from-pdf.js --dry-run   (preview)
 *   node server/scripts/import-prices-from-pdf.js             (apply)
 */
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync, readFileSync } from 'fs'
import pg from 'pg'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')
const PRICES_JSON = '/tmp/pdf_prices.json'
const DRY_RUN = process.argv.includes('--dry-run')

// Step 1: Load pre-extracted prices
let pdfPrices
try {
  pdfPrices = JSON.parse(readFileSync(PRICES_JSON, 'utf8'))
  console.log(`Loaded ${Object.keys(pdfPrices).length} price entries from ${PRICES_JSON}`)
} catch (e) {
  console.error(`Failed to read ${PRICES_JSON}:`, e.message)
  process.exit(1)
}

// Step 2: Connect to DB and match by SKU
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  const { rows: products } = await pool.query(`
    SELECT id, name, price, specs->>'sku' as sku 
    FROM products 
    WHERE specs->>'sku' IS NOT NULL AND specs->>'sku' != ''
    ORDER BY id
  `)

  console.log(`DB products with SKU: ${products.length}`)

  const toUpdate = []
  const notFound = []

  for (const p of products) {
    const pdfPrice = pdfPrices[p.sku]
    if (pdfPrice !== undefined) {
      toUpdate.push({ id: p.id, sku: p.sku, name: p.name, oldPrice: Number(p.price), newPrice: pdfPrice })
    } else {
      notFound.push(p.sku)
    }
  }

  console.log(`Matched: ${toUpdate.length} products will get prices`)
  console.log(`Not in PDF: ${notFound.length} products (price stays unchanged)`)

  if (toUpdate.length > 0) {
    console.log('\nSample (first 10):')
    toUpdate.slice(0, 10).forEach(u => {
      const name = u.name.substring(0, 38).padEnd(38)
      console.log(`  [${u.sku}] ${name} | ${String(u.oldPrice).padStart(8)} => ${u.newPrice.toLocaleString('ru')}`)
    })
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN - no changes made. Run without --dry-run to apply.')
    const preview = toUpdate.map(u => `${u.sku}\t${u.newPrice}\t${u.name}`).join('\n')
    writeFileSync(path.join(ROOT, 'price_import_preview.txt'), preview)
    console.log(`Preview saved to price_import_preview.txt (${toUpdate.length} rows)`)
  } else {
    console.log(`\nApplying ${toUpdate.length} price updates...`)
    let updated = 0
    for (const u of toUpdate) {
      await pool.query(`UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2`, [u.newPrice, u.id])
      updated++
      if (updated % 200 === 0) process.stdout.write(`\r  ${updated}/${toUpdate.length}`)
    }
    console.log(`\nDone! Prices updated for ${updated} products.`)
    console.log(`${notFound.length} products had no match in PDF (price left as-is).`)
  }

} catch (e) {
  console.error('Error:', e.message)
} finally {
  await pool.end()
}

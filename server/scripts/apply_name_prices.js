import { readFileSync } from 'fs'
import pg from 'pg'

const matches = JSON.parse(readFileSync('/tmp/price_matches_by_name.json', 'utf8'))
const DRY_RUN = process.argv.includes('--dry-run')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Applying prices for ${matches.length} products matched by name...\n`)

let updated = 0
for (const m of matches) {
  console.log(`  [${m.id}] ${m.db_name.padEnd(35)} → ${m.price.toLocaleString('ru-RU')} ₸ (from: ${m.pdf_name.substring(0,40)})`)
  if (!DRY_RUN) {
    await pool.query('UPDATE products SET price = $1, updated_at = NOW() WHERE id = $2', [m.price, m.id])
    updated++
  }
}

if (!DRY_RUN) {
  console.log(`\n✅ Updated prices for ${updated} products`)
} else {
  console.log(`\nDRY RUN done. Run without --dry-run to apply.`)
}
await pool.end()

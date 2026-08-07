import fs from 'fs'
import pg from 'pg'

const { Client } = pg

async function main() {
  const cache = JSON.parse(fs.readFileSync('/tmp/eicholtz-desc-translations.json', 'utf8'))
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  let updated = 0
  let skipped = 0
  const entries = Object.entries(cache)
  for (let i = 0; i < entries.length; i++) {
    const [en, ru] = entries[i]
    if (!en || !ru || en === ru || !/[а-яА-ЯёЁ]/.test(ru)) {
      skipped++
      continue
    }
    const res = await client.query(
      `UPDATE products
       SET description = $1, updated_at = NOW()
       WHERE description = $2
         AND description !~* '[а-яА-ЯёЁ]'`,
      [ru, en],
    )
    updated += res.rowCount
    if ((i + 1) % 200 === 0) console.log(JSON.stringify({ progress: i + 1, updated }))
  }
  const check = await client.query(
    `SELECT
      COUNT(*) FILTER (WHERE description ~* '[а-яА-ЯёЁ]')::int AS has_cyrillic,
      COUNT(*) FILTER (WHERE description <> '' AND description !~* '[а-яА-ЯёЁ]')::int AS en_left,
      COUNT(*) FILTER (WHERE description IS NULL OR TRIM(description)='')::int AS empty_desc
     FROM products WHERE published = true`,
  )
  console.log(JSON.stringify({ updated, skipped, ...check.rows[0] }))
  const florent = await client.query(
    `SELECT id, LEFT(description,180) AS d FROM products WHERE name ILIKE '%Florent Square%' ORDER BY id`,
  )
  console.log(JSON.stringify(florent.rows, null, 2))
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

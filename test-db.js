import { query } from './server/db.js'

async function run() {
  const { rows } = await query('SELECT id, name, hero_order FROM collections ORDER BY id ASC')
  console.log(rows)
  process.exit(0)
}

run()

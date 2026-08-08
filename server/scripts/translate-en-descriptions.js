/**
 * Translate English product descriptions to Russian.
 * Uses /tmp/eicholtz-desc-translations.json cache first, then MyMemory API.
 *
 * Usage: node server/scripts/translate-en-descriptions.js
 */
import fs from 'fs'
import { query, initDb, closePool } from '../db.js'

const TRANSLATIONS_PATH = '/tmp/eicholtz-desc-translations.json'

function loadTranslations() {
  try {
    return JSON.parse(fs.readFileSync(TRANSLATIONS_PATH, 'utf8'))
  } catch {
    return {}
  }
}

function saveTranslations(map) {
  fs.writeFileSync(TRANSLATIONS_PATH, JSON.stringify(map, null, 2))
}

function hasCyrillic(text) {
  return /[а-яА-ЯёЁ]/.test(text || '')
}

async function translateMyMemory(text) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=en|ru'
  const res = await fetch(url, {
    headers: { 'User-Agent': 'eicholtz-kz-translator/1.0' },
  })
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`)
  const data = await res.json()
  const translated = data?.responseData?.translatedText?.trim() || ''
  if (!translated || translated.toLowerCase() === text.toLowerCase()) {
    throw new Error('empty/same translation')
  }
  // MyMemory sometimes returns "MYMEMORY WARNING:..." 
  if (/MYMEMORY WARNING/i.test(translated)) {
    throw new Error(translated.slice(0, 120))
  }
  return translated
}

async function run() {
  await initDb()
  const translations = loadTranslations()
  console.log(`Cache entries: ${Object.keys(translations).length}`)

  const { rows } = await query(`
    SELECT id, name, description
    FROM products
    WHERE description <> '' AND description !~* '[а-яА-ЯёЁ]'
    ORDER BY id
  `)
  console.log(`EN descriptions to translate: ${rows.length}`)

  let fromCache = 0
  let fromApi = 0
  let failed = 0
  let cacheDirty = false

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const en = row.description.trim()
    let ru = translations[en]

    if (!ru || !hasCyrillic(ru)) {
      try {
        ru = await translateMyMemory(en)
        translations[en] = ru
        cacheDirty = true
        fromApi++
        // polite rate limit
        await new Promise((r) => setTimeout(r, 800))
      } catch (err) {
        failed++
        console.log(`[${i + 1}/${rows.length}] FAIL id=${row.id} ${row.name}: ${err.message}`)
        await new Promise((r) => setTimeout(r, 1200))
        continue
      }
    } else {
      fromCache++
    }

    if (!hasCyrillic(ru)) {
      failed++
      console.log(`[${i + 1}/${rows.length}] FAIL id=${row.id} no cyrillic`)
      continue
    }

    await query(`UPDATE products SET description = $1, updated_at = NOW() WHERE id = $2`, [
      ru,
      row.id,
    ])
    console.log(`[${i + 1}/${rows.length}] OK id=${row.id} ${row.name}`)
  }

  if (cacheDirty) {
    try {
      saveTranslations(translations)
      console.log('Cache saved')
    } catch (e) {
      console.log('Cache save skipped:', e.message)
    }
  }

  const { rows: stats } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE description <> '' AND description !~* '[а-яА-ЯёЁ]')::int AS en_left,
      COUNT(*) FILTER (WHERE description ~* '[а-яА-ЯёЁ]')::int AS ru,
      COUNT(*) FILTER (WHERE description IS NULL OR TRIM(description)='')::int AS empty_desc
    FROM products
  `)

  console.log('\n=== DONE ===')
  console.log({ fromCache, fromApi, failed, ...stats[0] })
  await closePool()
}

run().catch(async (err) => {
  console.error(err)
  await closePool().catch(() => {})
  process.exit(1)
})

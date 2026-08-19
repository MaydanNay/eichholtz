#!/usr/bin/env node
/**
 * Restore missing /images/* files referenced in DB.
 * Downloads from CDN / existing site assets — never deletes files.
 */
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { query, closePool } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_ROOT = path.join(__dirname, '../../public/images')

const RESTORE_PLAN = [
  {
    dest: 'products/1786967932913-c20bb748.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/115177_5_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786968330384-0e7e091d.jpg',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_5_1.jpg',
    format: 'jpeg',
  },
  {
    dest: 'products/1786968333969-5e685363.jpg',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_6_1.jpg',
    format: 'jpeg',
  },
  {
    dest: 'products/1786968360533-178a2f1e.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_7_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786968379291-26059f79.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_8_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786968394603-696209f4.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_9_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786968399300-335b83e0.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_10_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786968420770-46b1c7ab.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/118869_11_1.jpg',
    format: 'webp',
  },
  {
    dest: 'collections/1786295868074-fb474474.webp',
    remote: 'https://cdn.eichholtz.com/media/catalog/product/1/1/119381_0_1.jpg',
    format: 'webp',
  },
  {
    dest: 'products/1786183816810-2eec3371.png',
    localSource: 'catalogues/the-met.webp',
    format: 'png',
  },
]

async function collectDbImageRefs() {
  const { rows } = await query(`
    WITH refs AS (
      SELECT trim(image_url) AS url FROM products WHERE image_url LIKE '/images/%'
      UNION ALL
      SELECT trim(value) FROM products, jsonb_array_elements_text(COALESCE(images, '[]'::jsonb)) AS value
        WHERE trim(value) LIKE '/images/%'
      UNION ALL SELECT trim(image_url) FROM categories WHERE image_url LIKE '/images/%'
      UNION ALL SELECT trim(image_url) FROM collections WHERE image_url LIKE '/images/%'
      UNION ALL SELECT trim(image_url) FROM news WHERE image_url LIKE '/images/%'
      UNION ALL SELECT trim(image_url) FROM seasons WHERE image_url LIKE '/images/%'
    )
    SELECT url FROM refs WHERE url <> '' GROUP BY url ORDER BY url
  `)
  return rows.map((r) => r.url)
}

async function writeImage(destRelative, buffer, format) {
  const dest = path.join(IMAGES_ROOT, destRelative)
  await fs.mkdir(path.dirname(dest), { recursive: true })

  let output = buffer
  if (format === 'webp') {
    output = await sharp(buffer).webp({ quality: 88 }).toBuffer()
  } else if (format === 'png') {
    output = await sharp(buffer).png().toBuffer()
  } else if (format === 'jpeg') {
    output = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
  }

  await fs.writeFile(dest, output)
  const stat = await fs.stat(dest)
  return stat.size
}

async function restoreEntry(entry) {
  const destRelative = entry.dest
  const dest = path.join(IMAGES_ROOT, destRelative)

  try {
    await fs.access(dest)
    console.log(`SKIP exists ${destRelative}`)
    return { dest: destRelative, status: 'exists' }
  } catch {
    // restore
  }

  let sourceBuffer
  if (entry.localSource) {
    const localPath = path.join(IMAGES_ROOT, entry.localSource)
    sourceBuffer = await fs.readFile(localPath)
    console.log(`RESTORE ${destRelative} <= local:${entry.localSource}`)
  } else {
    const res = await fetch(entry.remote)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${entry.remote}`)
    sourceBuffer = Buffer.from(await res.arrayBuffer())
    console.log(`RESTORE ${destRelative} <= ${entry.remote}`)
  }

  const bytes = await writeImage(destRelative, sourceBuffer, entry.format)
  console.log(`  saved ${bytes} bytes`)
  return { dest: destRelative, status: 'restored', bytes }
}

async function main() {
  const dbRefs = await collectDbImageRefs()
  const missingInDb = []

  for (const url of dbRefs) {
    const rel = url.replace(/^\/images\//, '')
    try {
      await fs.access(path.join(IMAGES_ROOT, rel))
    } catch {
      missingInDb.push(url)
    }
  }

  console.log('DB local image refs:', dbRefs.length)
  console.log('Missing before restore:', missingInDb.length)
  if (missingInDb.length) {
    console.log(missingInDb.map((u) => `  ${u}`).join('\n'))
  }

  const results = []
  for (const entry of RESTORE_PLAN) {
    results.push(await restoreEntry(entry))
  }

  const stillMissing = []
  for (const url of dbRefs) {
    const rel = url.replace(/^\/images\//, '')
    try {
      await fs.access(path.join(IMAGES_ROOT, rel))
    } catch {
      stillMissing.push(url)
    }
  }

  console.log('\nSummary:')
  for (const r of results) {
    console.log(`  ${r.status.padEnd(8)} ${r.dest}${r.bytes ? ` (${r.bytes} B)` : ''}`)
  }
  console.log('Still missing after restore:', stillMissing.length)
  if (stillMissing.length) {
    console.log(stillMissing.map((u) => `  ${u}`).join('\n'))
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => closePool())

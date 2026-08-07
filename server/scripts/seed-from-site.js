import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, initDb, closePool, validateEnv } from '../db.js'
import { DEFAULT_CATALOGS } from '../lib/catalogs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '../..')
const IMAGES_ROOT = path.join(ROOT, 'public/images')
const SITE = 'https://eichholtz.kz'

const CATEGORY_ITEMS = [
  { name: 'Столы', remote: 'https://static.tildacdn.pro/tild6236-6234-4161-b561-663637333366/inspired-by-nature-h.jpg', file: 'categories/stoly.jpg', category: 'Столы', sitemapPrefix: 'tables' },
  { name: 'Кресла', remote: 'https://static.tildacdn.pro/tild3232-3930-4037-b737-333032356534/inspired-by-nature-h.jpg', file: 'categories/kresla.jpg', category: 'Кресла', sitemapPrefix: 'chairs' },
  { name: 'Диваны', remote: 'https://static.tildacdn.pro/tild6461-3530-4063-b736-366131306435/inspired-by-nature-h.jpg', file: 'categories/divany.jpg', category: 'Диваны', sitemapPrefix: 'sofas' },
  { name: 'Освещение', remote: 'https://static.tildacdn.pro/tild6265-6532-4439-b436-356630316131/inspired-by-nature-h.jpg', file: 'categories/osveshchenie.jpg', category: 'Освещение', sitemapPrefix: 'lights' },
  { name: 'Спальня', remote: 'https://static.tildacdn.pro/tild6535-3732-4332-b066-313937663630/inspired-by-nature-h.jpg', file: 'categories/spalnya.jpg', category: 'Спальня', sitemapPrefix: 'bedroom' },
  { name: 'Люстры', remote: 'https://static.tildacdn.pro/tild3937-3331-4331-a231-346539356430/inspired-by-nature-h.jpg', file: 'categories/lyustry.jpg', category: 'Люстры', sitemapPrefix: 'ceiling' },
  { name: 'Аксессуары', remote: 'https://static.tildacdn.pro/tild3363-3430-4331-b564-386435346265/inspired-by-nature-h.jpg', file: 'categories/aksessuary.jpg', category: 'Аксессуары', sitemapPrefix: 'accessories' },
  { name: 'Для улицы', remote: 'https://static.tildacdn.pro/tild3932-6462-4662-b038-303831336564/inspired-by-nature-h.jpg', file: 'categories/outdoor.jpg', category: 'Для улицы', sitemapPrefix: 'outdoor' },
]

const CATALOG_ITEMS = DEFAULT_CATALOGS.map((item) => ({
  name: item.name,
  remote: item.image_url.startsWith('http') ? item.image_url : `https://eichholtz.kz${item.image_url}`,
  file: item.image_url.replace(/^\/images\//, ''),
  pdf_url: item.pdf_url,
}))

const HERO_ITEMS = [
  { remote: 'https://static.tildacdn.pro/tild3932-3634-4266-b938-646666333834/TK-06_0043jpg.jpeg', file: 'hero/hero-1.jpg' },
  { remote: 'https://static.tildacdn.pro/tild6335-6561-4465-b439-396438626132/TK-07_0022jpg.jpeg', file: 'hero/hero-2.jpg' },
  { remote: 'https://static.tildacdn.pro/tild6232-3362-4763-b866-663432643665/CDJ_TK-02_0125jpg.jpeg', file: 'hero/hero-3.jpg' },
]

const LOYALTY_REMOTE = 'https://static.tildacdn.pro/tild3166-3332-4665-a161-626132613765/TK-33_0019.webp'

const ABOUT_IMAGES = [
  { remote: 'https://static.tildacdn.pro/tild6661-6637-4838-b835-613532376338/116140_5.webp', file: 'about/about-1.webp' },
  { remote: 'https://static.tildacdn.pro/tild3339-3538-4962-b633-303563333639/115507_2.webp', file: 'about/about-2.webp' },
  { remote: 'https://static.tildacdn.pro/tild3664-6533-4065-b332-303862386538/117219_7.webp', file: 'about/about-3.webp' },
]

const CONTACTS_HERO = {
  remote: 'https://static.tildacdn.pro/tild6162-3262-4964-b362-613365353930/3333.jpg',
  file: 'contacts/hero.jpg',
}

const DESIGNER_IMAGES = [
  { remote: 'https://static.tildacdn.pro/tild6661-6637-4838-b835-613532376338/116140_5.webp', file: 'designers/feature-1.webp' },
  { remote: 'https://static.tildacdn.pro/tild3339-3538-4962-b633-303563333639/115507_2.webp', file: 'designers/feature-2.webp' },
  { remote: 'https://static.tildacdn.pro/tild6534-3530-4330-b637-653064626234/Screenshot_2026-01-0.png', file: 'designers/feature-3.png' },
  { remote: 'https://static.tildacdn.pro/tild3162-6233-4936-b462-306534343931/116932UL_4.webp', file: 'designers/feature-4.webp' },
  { remote: 'https://static.tildacdn.pro/tild6161-3563-4137-b838-396565316434/116917UL_5.webp', file: 'designers/feature-5.webp' },
  { remote: 'https://static.tildacdn.pro/tild3065-3861-4834-a439-376637346365/113733_02.webp', file: 'designers/feature-6.webp' },
  { remote: 'https://static.tildacdn.pro/tild6538-6430-4164-b466-643166616261/1_1_119309_1_1_1.webp', file: 'designers/feature-7.webp' },
  { remote: 'https://static.tildacdn.pro/tild3665-6662-4235-b461-363839343562/TK-33_0019.webp', file: 'designers/info.webp' },
]

const NEWS_URLS = [
  `${SITE}/tpost/j2b8mieps1-the-met-eichholtz-kollaboratsiya-2025`,
  `${SITE}/tpost/new-collection-sept-2025`,
  `${SITE}/tpost/p4m67sh5j1-dragotsennosti-dlya-sovremennogo-interer`,
  `${SITE}/tpost/7sx8a0spm1-osnovano-na-teksture`,
  `${SITE}/tpost/iegkzl7cb1-novaya-kollektsiya-2026-prazdnuem-iskuss`,
]

function localPath(file) {
  return `/images/${file}`
}

async function downloadFile(remote, file) {
  const dest = path.join(IMAGES_ROOT, file)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  const res = await fetch(remote)
  if (!res.ok) throw new Error(`Download failed ${remote}: ${res.status}`)
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()))
  console.log(`  saved ${file}`)
  return localPath(file)
}

function meta(html, property) {
  const re = new RegExp(`property="${property}" content="([^"]+)"`)
  return html.match(re)?.[1] || ''
}

function metaName(html, name) {
  const re = new RegExp(`name="${name}" content="([^"]+)"`)
  return html.match(re)?.[1] || ''
}

async function scrapeNews(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`News fetch failed ${url}: ${res.status}`)
  const html = await res.text()
  const title = meta(html, 'og:title') || html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || 'Новость'
  const description = meta(html, 'og:description') || metaName(html, 'description')
  const imageRemote = meta(html, 'og:image')
  let image_url = ''
  if (imageRemote) {
    const slug = url.split('/').pop()
    const ext = path.extname(new URL(imageRemote).pathname) || '.jpg'
    const file = `news/${slug}${ext}`
    image_url = await downloadFile(imageRemote, file)
  }
  return { title: title.replace(/\s*\|\s*Eichholtz.*$/i, ''), content: description, image_url }
}

async function loadSitemapProducts() {
  const res = await fetch(`${SITE}/sitemap-store-part1.xml`)
  if (!res.ok) return []
  const xml = await res.text()
  return [...xml.matchAll(/<loc>(https:\/\/eichholtz\.kz\/[^<]+)<\/loc>/g)].map((m) => m[1])
}

async function scrapeProduct(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  const html = await res.text()
  const title = meta(html, 'og:title') || html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()
  if (!title) return null
  const imageRemote = meta(html, 'og:image')
  if (!imageRemote) return null
  const slug = url.split('/').pop()
  const ext = path.extname(new URL(imageRemote).pathname) || '.jpg'
  const file = `products/${slug}${ext}`
  const image_url = await downloadFile(imageRemote, file)
  const name = title.replace(/\s*\|\s*Eichholtz.*$/i, '').replace(/\s*-\s*купить.*$/i, '').trim()
  return { name, image_url, category: url.split('/')[3] === 'tproduct' ? '' : url.split('/')[3] }
}

async function seedProducts(collectionsByPrefix) {
  const urls = await loadSitemapProducts()
  let count = 0

  for (const item of CATEGORY_ITEMS) {
    const productUrl = urls.find((url) => url.includes(`/${item.sitemapPrefix}/tproduct/`))
    if (!productUrl) continue

    const product = await scrapeProduct(productUrl)
    if (!product) continue

    const collectionId = collectionsByPrefix[item.name]
    await query(
      `INSERT INTO products (name, description, price, category, image_url, in_stock, collection_id, published)
       VALUES ($1, $2, 0, $3, $4, true, $5, true)`,
      [product.name, '', item.category, product.image_url, collectionId],
    )
    count += 1
    console.log(`  product: ${product.name}`)
  }

  return count
}

async function writeSiteImages(heroPaths, loyaltyPath, catalogPaths, contactsHeroPath) {
  const aboutPaths = ABOUT_IMAGES.map((item) => localPath(item.file))
  const content = `export const SITE_IMAGES = {
  hero: [
    '${heroPaths[0]}',
    '${heroPaths[1]}',
    '${heroPaths[2]}',
  ],
  category: '${localPath(CATEGORY_ITEMS[0].file)}',
  loyalty: '${loyaltyPath}',
  catalogs: {
    'Spring 2025': '${catalogPaths[0]}',
    'The MET': '${catalogPaths[1]}',
    'Fall 2025': '${catalogPaths[2]}',
    default: [
      '${catalogPaths[0]}',
      '${catalogPaths[1]}',
      '${catalogPaths[2]}',
    ],
  },
  about: [
    '${aboutPaths[0]}',
    '${aboutPaths[1]}',
    '${aboutPaths[2]}',
  ],
  contactsHero: '${contactsHeroPath}',
}
`
  const siteImagesPath = path.join(ROOT, 'src/data/siteImages.js')
  try {
    await fs.access(siteImagesPath)
    await fs.writeFile(siteImagesPath, content)
    console.log('  updated src/data/siteImages.js')
  } catch {
    console.log('  skip src/data/siteImages.js (not available in this environment)')
  }
}

async function seed(force) {
  validateEnv()
  await initDb()

  const { rows } = await query('SELECT COUNT(*)::int AS count FROM collections')
  if (rows[0].count > 0 && !force) {
    console.log('Database already has collections. Run with --force to replace.')
    return
  }

  if (force) {
    await query('DELETE FROM products')
    await query('DELETE FROM collections')
    await query('DELETE FROM news')
    await query('DELETE FROM seasons')
  }

  console.log('Downloading images from eichholtz.kz ...')

  const heroPaths = []
  for (const item of HERO_ITEMS) {
    heroPaths.push(await downloadFile(item.remote, item.file))
  }

  const loyaltyPath = await downloadFile(LOYALTY_REMOTE, 'loyalty/loyalty.webp')

  const catalogPaths = []
  for (const item of CATALOG_ITEMS) {
    catalogPaths.push(await downloadFile(item.remote, item.file))
  }

  const categoryPaths = new Map()
  for (const item of CATEGORY_ITEMS) {
    categoryPaths.set(item.name, await downloadFile(item.remote, item.file))
  }

  for (const item of ABOUT_IMAGES) {
    await downloadFile(item.remote, item.file)
  }

  const contactsHeroPath = await downloadFile(CONTACTS_HERO.remote, CONTACTS_HERO.file)

  for (const item of DESIGNER_IMAGES) {
    await downloadFile(item.remote, item.file)
  }

  await writeSiteImages(heroPaths, loyaltyPath, catalogPaths, contactsHeroPath)

  console.log('Seeding database ...')

  const { rows: seasonRows } = await query(
    `INSERT INTO seasons (name, description, image_url, published)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    ['Весна / Лето 2026', 'Новая коллекция Eichholtz', heroPaths[0]],
  )
  const seasonId = seasonRows[0].id

  const { rows: catalogSeasonRows } = await query(
    `INSERT INTO seasons (name, description, image_url, published)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    ['Каталоги', 'PDF-каталоги коллекций Eichholtz', catalogPaths[0]],
  )
  const catalogSeasonId = catalogSeasonRows[0].id

  const collectionsByName = {}

  for (const [index, item] of CATEGORY_ITEMS.entries()) {
    const { rows: colRows } = await query(
      `INSERT INTO collections (season_id, name, description, image_url, published, sort_order, kind)
       VALUES ($1, $2, $3, $4, true, $5, 'category')
       RETURNING id`,
      [seasonId, item.name, '', categoryPaths.get(item.name), index + 1],
    )
    collectionsByName[item.name] = colRows[0].id
  }

  for (const [index, item] of CATALOG_ITEMS.entries()) {
    await query(
      `INSERT INTO collections (season_id, name, description, image_url, pdf_url, published, sort_order, kind)
       VALUES ($1, $2, $3, $4, $5, true, $6, 'catalog')`,
      [catalogSeasonId, item.name, '', `/images/${item.file}`, item.pdf_url || '', index + 1],
    )
  }

  console.log('Seeding news ...')
  for (const url of NEWS_URLS) {
    try {
      const news = await scrapeNews(url)
      await query(
        `INSERT INTO news (title, content, image_url, published)
         VALUES ($1, $2, $3, true)`,
        [news.title, news.content, news.image_url],
      )
      console.log(`  news: ${news.title}`)
    } catch (err) {
      console.warn(`  skip news ${url}: ${err.message}`)
    }
  }

  console.log('Seeding sample products ...')
  const productCount = await seedProducts(collectionsByName)

  console.log(`Done. Collections: ${CATEGORY_ITEMS.length + CATALOG_ITEMS.length}, products: ${productCount}`)
}

const force = process.argv.includes('--force')

seed(force)
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => closePool())

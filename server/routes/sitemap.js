import { Router } from 'express'
import { query } from '../db.js'
import { collectionPath, productPath, categoryPath } from '../lib/productUrl.js'

const router = Router()

const STATIC_PATHS = [
  '/',
  '/designers',
  '/catalogues',
  '/events',
  '/about',
  '/contacts',
]

function getSiteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlEntry(siteUrl, path, lastmod) {
  const loc = `${siteUrl}${path}`
  const lastmodTag = lastmod
    ? `<lastmod>${escapeXml(lastmod)}</lastmod>`
    : ''
  return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`
}

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const siteUrl = getSiteUrl()
    const [{ rows: products }, { rows: news }, { rows: collections }, { rows: categories }] = await Promise.all([
      query('SELECT id, name, updated_at FROM products WHERE published = true ORDER BY updated_at DESC'),
      query('SELECT id, updated_at FROM news WHERE published = true ORDER BY updated_at DESC'),
      query('SELECT id, name, kind, updated_at FROM collections WHERE published = true ORDER BY updated_at DESC'),
      query('SELECT id, name, updated_at FROM categories WHERE published = true ORDER BY updated_at DESC'),
    ])

    const entries = [
      ...STATIC_PATHS.map((path) => urlEntry(siteUrl, path)),
      ...products.map((product) => urlEntry(
        siteUrl,
        productPath(product),
        product.updated_at?.toISOString?.().slice(0, 10),
      )),
      ...collections.map((collection) => urlEntry(
        siteUrl,
        collectionPath(collection),
        collection.updated_at?.toISOString?.().slice(0, 10),
      )),
      ...categories.map((category) => urlEntry(
        siteUrl,
        categoryPath(category),
        category.updated_at?.toISOString?.().slice(0, 10),
      )),
      ...news.map((item) => urlEntry(
        siteUrl,
        `/news/${item.id}`,
        item.updated_at?.toISOString?.().slice(0, 10),
      )),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`

    res.type('application/xml').send(xml)
  } catch {
    res.status(500).type('text/plain').send('Sitemap error')
  }
})

router.get('/robots.txt', (_req, res) => {
  const siteUrl = getSiteUrl()
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
  )
})

export default router

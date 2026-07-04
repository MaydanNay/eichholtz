import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { waitForDb, ping, closePool, validateEnv } from './db.js'
import authRoutes from './routes/auth.js'
import favoritesRoutes from './routes/favorites.js'
import cartRoutes from './routes/cart.js'
import productsRoutes from './routes/products.js'
import ordersRoutes from './routes/orders.js'
import newsRoutes from './routes/news.js'
import seasonsRoutes from './routes/seasons.js'
import collectionsRoutes from './routes/collections.js'
import categoriesRoutes from './routes/categories.js'
import clientsRoutes from './routes/clients.js'
import usersRoutes from './routes/users.js'
import inquiriesRoutes from './routes/inquiries.js'
import uploadsRoutes from './routes/uploads.js'
import myOrdersRoutes from './routes/myOrders.js'
import sitemapRoutes from './routes/sitemap.js'
import homeSettingsRoutes from './routes/homeSettings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'

validateEnv()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.use(sitemapRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/favorites', favoritesRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/seasons', seasonsRoutes)
app.use('/api/collections', collectionsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/clients', clientsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/inquiries', inquiriesRoutes)
app.use('/api/my-orders', myOrdersRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/home-settings', homeSettingsRoutes)

const imagesPath = path.join(__dirname, '../public/images')
app.use('/images', express.static(imagesPath))

app.get('/api/health', async (_req, res) => {
  try {
    await ping()
    res.json({ status: 'ok', db: 'connected' })
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' })
  }
})

if (isProd) {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

await waitForDb()

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} inside container`)
  if (isProd) {
    console.log(`Open in browser: http://localhost:${process.env.APP_PORT || 3000}`)
  }
})

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`)
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

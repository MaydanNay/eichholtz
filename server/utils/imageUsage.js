import { query } from '../db.js'

const ENTITY_TABLES = {
  product: 'products',
  news: 'news',
  season: 'seasons',
  collection: 'collections',
  category: 'categories',
}

export async function isUploadedImageInUse(url, except) {
  const exceptType = except?.type
  const exceptId = except?.id != null ? Number(except.id) : null

  const productParams = [url]
  let productSql = `
    SELECT id FROM products
    WHERE image_url = $1 OR images @> jsonb_build_array($1)
  `
  if (exceptType === 'product' && exceptId) {
    productParams.push(exceptId)
    productSql += ` AND id != $${productParams.length}`
  }
  productSql += ' LIMIT 1'

  const { rows: productRows } = await query(productSql, productParams)
  if (productRows.length > 0) return true

  for (const [type, table] of Object.entries(ENTITY_TABLES)) {
    if (type === 'product') continue

    const params = [url]
    let sql = `SELECT id FROM ${table} WHERE image_url = $1`
    if (exceptType === type && exceptId) {
      params.push(exceptId)
      sql += ` AND id != $${params.length}`
    }
    sql += ' LIMIT 1'

    const { rows } = await query(sql, params)
    if (rows.length > 0) return true
  }

  return false
}

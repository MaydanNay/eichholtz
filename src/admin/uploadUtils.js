export const UPLOAD_CATEGORIES = ['products', 'news', 'seasons', 'collections', 'categories']

export function isManagedImage(url, category) {
  if (!url) return false
  if (category) {
    return new RegExp(`^/images/${category}/[a-zA-Z0-9._-]+$`).test(url)
  }
  return /^\/images\/(products|news|seasons|collections|categories)\/[a-zA-Z0-9._-]+$/.test(url)
}

export function isManagedProductImage(url) {
  return isManagedImage(url, 'products')
}

function imagesFromProduct(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images.filter(Boolean)
  }
  return product?.image_url ? [product.image_url] : []
}

export { imagesFromProduct }

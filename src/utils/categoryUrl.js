import { slugifyProductName } from './productUrl'

export function categorySlugPath(category) {
  const slug = slugifyProductName(category.name)
  return `${category.id}${slug ? `-${slug}` : ''}`
}

export function categoryUrl(category) {
  return `/category/${categorySlugPath(category)}`
}

export function parseCategoryIdFromSlug(param) {
  const id = Number(String(param || '').split('-')[0])
  return Number.isFinite(id) && id > 0 ? id : null
}

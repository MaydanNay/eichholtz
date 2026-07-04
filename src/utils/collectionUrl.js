import { slugifyProductName } from './productUrl'

export function collectionSlugPath(collection) {
  const slug = slugifyProductName(collection.name)
  return `${collection.id}${slug ? `-${slug}` : ''}`
}

export function collectionUrl(collection) {
  const prefix = collection.kind === 'catalog' ? '/catalog' : '/collection'
  return `${prefix}/${collectionSlugPath(collection)}`
}

export function parseCollectionIdFromSlug(param) {
  const id = Number(String(param || '').split('-')[0])
  return Number.isFinite(id) && id > 0 ? id : null
}

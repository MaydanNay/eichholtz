import { SITE_IMAGES } from '../data/siteImages'

export function getCollectionImage(collection, index = 0) {
  if (collection?.image_url) return collection.image_url
  const hero = SITE_IMAGES.hero
  if (hero.length > 0) return hero[index % hero.length]
  return SITE_IMAGES.collectionDefault
}

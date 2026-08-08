import { collectionUrl } from './collectionUrl'
import { SITE_IMAGES } from '../data/siteImages'

export function createEmptyHeroSlide() {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subtitle: '',
    title: '',
    image_url: '',
    link: '',
    collection_id: null,
  }
}

export function parseHeroSlides(raw) {
  if (raw == null || raw === '') return []
  try {
    let parsed = raw
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim()
      // Broken saves from String(array) → "[object Object]"
      if (!trimmed || trimmed.includes('[object Object]')) return []
      parsed = JSON.parse(trimmed)
      // Handle accidental double-encoding
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
    }
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((slide, index) => ({
        id: slide.id || `slide-${index + 1}`,
        subtitle: slide.subtitle || slide.season_name || '',
        title: slide.title || slide.name || '',
        image_url: slide.image_url || '',
        link: slide.link || '',
        collection_id: slide.collection_id ?? null,
      }))
      .filter((slide) => slide.title || slide.image_url || slide.link)
  } catch {
    return []
  }
}

/** Build editable slides from legacy collection.hero_order if settings are empty. */
export function slidesFromHeroCollections(collections = []) {
  return collections
    .filter((c) => c.hero_order != null)
    .sort((a, b) => a.hero_order - b.hero_order)
    .map((c, index) => ({
      id: `legacy-${c.id}-${index}`,
      subtitle: c.season_name || '',
      title: c.name || '',
      image_url: c.image_url || '',
      link: collectionUrl(c),
      collection_id: c.id,
    }))
}

export function slideImage(slide, index = 0) {
  if (slide?.image_url) return slide.image_url
  const hero = SITE_IMAGES.hero
  if (hero.length > 0) return hero[index % hero.length]
  return SITE_IMAGES.collectionDefault
}

export function isExternalLink(link) {
  return /^https?:\/\//i.test(String(link || '').trim())
}

import { useEffect } from 'react'

const SITE_NAME = 'Eichholtz Казахстан'
const DEFAULT_DESCRIPTION = 'Мебель и аксессуары Eichholtz в Казахстане — каталог коллекций, дизайнерские интерьеры и оформление заказа онлайн.'

export function getSiteUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return import.meta.env.VITE_SITE_URL || ''
}

function upsertMeta(attr, key, content) {
  if (!content) return

  let element = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (!href) return

  let element = document.head.querySelector(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

export function usePageMeta({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  path,
  type = 'website',
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return undefined

    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const siteUrl = getSiteUrl()
    const pageUrl = path && siteUrl ? `${siteUrl}${path}` : (siteUrl || '')
    const imageUrl = image && siteUrl && image.startsWith('/')
      ? `${siteUrl}${image}`
      : image

    document.title = fullTitle
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', type)
    upsertMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description)

    if (pageUrl) {
      upsertMeta('property', 'og:url', pageUrl)
      upsertLink('canonical', pageUrl)
    }

    if (imageUrl) {
      upsertMeta('property', 'og:image', imageUrl)
      upsertMeta('name', 'twitter:image', imageUrl)
    }

    return undefined
  }, [title, description, image, path, type, enabled])
}

export { DEFAULT_DESCRIPTION, SITE_NAME }

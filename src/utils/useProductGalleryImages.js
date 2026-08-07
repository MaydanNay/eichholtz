import { useEffect, useMemo, useState } from 'react'
import { filterProductImages, getProductImages } from './productImages'

/**
 * Gallery URLs for a product with Eichholtz CDN placeholders filtered out.
 * Shows the first (usually real) cover first, then the cleaned gallery.
 */
export function useProductGalleryImages(product) {
  const raw = useMemo(() => getProductImages(product), [product])
  const rawKey = raw.join('\n')
  const [images, setImages] = useState(() => raw.slice(0, 1))

  useEffect(() => {
    let cancelled = false
    setImages(raw.slice(0, 1))

    if (raw.length === 0) {
      setImages([])
      return undefined
    }

    filterProductImages(raw).then((next) => {
      if (!cancelled) setImages(next.length > 0 ? next : raw.slice(0, 1))
    })

    return () => {
      cancelled = true
    }
  }, [rawKey])

  return images
}

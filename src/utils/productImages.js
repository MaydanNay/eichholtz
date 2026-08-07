/** Eichholtz gray EH logo placeholders are tiny (~5795 bytes, 540×540). */
const PLACEHOLDER_MAX_BYTES = 15000
const SMALL_PLACEHOLDER_EDGE = 540

/** @type {Map<string, boolean>} */
const usabilityCache = new Map()

export function getProductImages(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images.filter(Boolean)
  }
  return product?.image_url ? [product.image_url] : []
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = url
  })
}

async function probeContentLength(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', mode: 'cors' })
    if (!res.ok) return null
    const raw = res.headers.get('content-length')
    if (raw == null || raw === '') return null
    const len = Number(raw)
    return Number.isFinite(len) ? len : null
  } catch {
    return null
  }
}

/** True unless URL is a gray Eichholtz EH placeholder. Keeps white dimension drawings. */
export async function isUsableProductImage(url) {
  if (!url) return false
  if (usabilityCache.has(url)) return usabilityCache.get(url)

  let usable = true

  try {
    const length = await probeContentLength(url)
    if (length != null && length > 0 && length < PLACEHOLDER_MAX_BYTES) {
      usable = false
    } else if (length == null) {
      // No Content-Length — fall back to known EH placeholder dimensions
      const img = await loadImage(url)
      if (
        img.naturalWidth > 0
        && img.naturalHeight > 0
        && img.naturalWidth <= SMALL_PLACEHOLDER_EDGE
        && img.naturalHeight <= SMALL_PLACEHOLDER_EDGE
      ) {
        usable = false
      }
    }
  } catch {
    usable = true
  }

  usabilityCache.set(url, usable)
  return usable
}

/** Drop gray EH CDN placeholders only; keep photos and white drawings. */
export async function filterProductImages(urls) {
  const list = (Array.isArray(urls) ? urls : []).filter(Boolean)
  if (list.length === 0) return []

  const flags = await Promise.all(list.map((url) => isUsableProductImage(url)))
  return list.filter((_, index) => flags[index])
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function slugifyProductName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function productUrl(product) {
  const slug = slugifyProductName(product.name)
  return `/tproduct/${product.id}${slug ? `-${slug}` : ''}`
}

export function parseProductIdFromSlug(param) {
  const id = Number(String(param || '').split('-')[0])
  return Number.isFinite(id) && id > 0 ? id : null
}

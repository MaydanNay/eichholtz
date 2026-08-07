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

export function productPath(product) {
  const slug = slugifyProductName(product.name)
  return `/tproduct/${product.id}${slug ? `-${slug}` : ''}`
}

export function collectionPath(collection) {
  const slug = slugifyProductName(collection.name)
  const prefix = collection.kind === 'catalog' ? '/catalog' : '/collection'
  return `${prefix}/${collection.id}${slug ? `-${slug}` : ''}`
}

export function categoryPath(category) {
  const slug = slugifyProductName(category.name)
  return `/category/${category.id}${slug ? `-${slug}` : ''}`
}

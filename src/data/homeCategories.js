/** Fixed homepage category tiles: display name + image, matched to DB by name/aliases. */
export const HOME_CATEGORIES = [
  {
    name: 'Диваны',
    aliases: ['Sofas', 'Диваны | Пуфики', 'Sofas | Ottomans'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/sofas-category-banner-eichholtz.jpg',
  },
  {
    name: 'Люстры',
    aliases: ['Chandeliers'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/chandelier-category-banner-eichholtz-1.jpg',
  },
  {
    name: 'Столы',
    aliases: ['Tables'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/tables-category-banner-eichholtz.jpg',
  },
  {
    name: 'Кресла',
    aliases: ['Chairs', 'Armchairs'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/chairs-category-banner-eichholtz.jpg',
  },
  {
    name: 'Шкафы',
    aliases: ['Cabinets'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/cabinets-category-banner-eichholtz-1.jpg',
  },
  {
    name: 'Аксессуары',
    aliases: ['Accessories'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/accessories-category-banner-eichholtz.jpg',
  },
  {
    name: 'Освещение',
    aliases: ['Lighting'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-category-lighting-week-16-1_2.jpg',
  },
  {
    name: 'Уличная мебель',
    aliases: ['Outdoor', 'Для улицы', 'Outdoor Furniture'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-outdoofr_3.jpg',
  },
]

export function matchHomeCategory(dbCategories, homeCategory) {
  const names = new Set([homeCategory.name, ...(homeCategory.aliases || [])])
  const matches = dbCategories.filter((c) => names.has(c.name))
  if (matches.length === 0) return null

  return (
    matches.find((c) => c.parent_id == null && c.name === homeCategory.name) ||
    matches.find((c) => c.parent_id == null) ||
    matches.find((c) => c.image_url) ||
    matches[0]
  )
}

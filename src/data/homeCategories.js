/** Fixed homepage category tiles: display name + image, matched to DB by name/aliases. */
export const HOME_CATEGORIES = [
  {
    name: 'Диваны | Пуфики',
    aliases: ['Sofas', 'Диваны'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-sofas_2.jpg',
  },
  {
    name: 'Люстры',
    aliases: ['Chandeliers'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-chandeliers-1_3.jpg',
  },
  {
    name: 'Столы',
    aliases: ['Tables'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-tables-1_1.jpg',
  },
  {
    name: 'Шкафы',
    aliases: ['Cabinets'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-cabinets-1_1.jpg',
  },
  {
    name: 'Аксессуары',
    aliases: ['Accessories'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-accessories-1_3.jpg',
  },
  {
    name: 'Ковры | Ковровые покрытия',
    aliases: ['Rugs', 'Carpets', 'Ковры'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-outdoor-homepage-carpets_6.jpg',
  },
  {
    name: 'Освещение',
    aliases: ['Lighting'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-category-lighting-week-16-1_2.jpg',
  },
  {
    name: 'Для улицы',
    aliases: ['Outdoor'],
    image: 'https://cdn.eichholtz.com/media/wysiwyg/eichholtz-depth-of-design-outdoofr_3.jpg',
  },
]

export function matchHomeCategory(dbCategories, homeCategory) {
  const names = [homeCategory.name, ...(homeCategory.aliases || [])]
  const matches = dbCategories.filter((c) => names.includes(c.name))
  if (matches.length === 0) return null

  return (
    matches.find((c) => c.parent_id == null) ||
    matches.find((c) => c.image_url) ||
    matches[0]
  )
}

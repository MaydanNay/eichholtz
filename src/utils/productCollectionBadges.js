/** Collection collab badges shown on product media (catalog + detail). */

const COLLECTION_BADGES = [
  {
    id: 'the-met',
    collectionIds: [127, 135, 136],
    names: [
      'The Met x Eichholtz',
      'The Met',
      'The MET',
      'The Met Collection',
    ],
    src: '/images/the-met-logo.png',
    alt: 'The Met x Eichholtz',
  },
  {
    id: 'corey-damen-jenkins',
    collectionIds: [128],
    names: ['Corey Damen Jenkins'],
    src: '/images/cdj-logo.png',
    alt: 'Corey Damen Jenkins',
  },
]

function readSpecs(product) {
  let specs = product?.specs
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs)
    } catch {
      specs = {}
    }
  }
  return specs && typeof specs === 'object' ? specs : {}
}

function collectMembershipNames(product) {
  const names = new Set()
  const specs = readSpecs(product)

  if (product?.collection_name) names.add(String(product.collection_name).trim())

  const extras = specs.extra_collections
  if (Array.isArray(extras)) {
    extras.forEach((item) => {
      if (item != null && String(item).trim()) names.add(String(item).trim())
    })
  } else if (typeof extras === 'string' && extras.trim()) {
    names.add(extras.trim())
  }

  return names
}

export function getProductCollectionBadges(product) {
  if (!product) return []

  const names = collectMembershipNames(product)
  const collectionId = product.collection_id != null ? Number(product.collection_id) : null
  const matched = []

  for (const badge of COLLECTION_BADGES) {
    const byId = collectionId != null && badge.collectionIds.includes(collectionId)
    const byName = badge.names.some((name) => names.has(name))
    if (byId || byName) matched.push(badge)
  }

  return matched
}

import { useEffect, useMemo, useState } from 'react'
import { getCategories } from '../api/categories'
import { HOME_CATEGORIES, matchHomeCategory } from '../data/homeCategories'
import Reveal from '../components/Reveal'

export default function CollectionSection({ onCategorySelect }) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getCategories(true)
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const tiles = useMemo(
    () =>
      HOME_CATEGORIES.map((homeCategory) => {
        const match = matchHomeCategory(categories, homeCategory)
        return {
          key: homeCategory.name,
          id: match?.id ?? null,
          displayName: homeCategory.name,
          image: homeCategory.image,
          category: match ? { ...match, name: homeCategory.name } : null,
        }
      }).filter((tile) => tile.id != null),
    [categories],
  )

  return (
    <section className="collection" id="collection">
      {loading ? null : tiles.length === 0 ? (
        <p className="collection__empty">Категории скоро появятся</p>
      ) : (
        <Reveal as="div" className="category-grid reveal-stagger" variant="up" delay={120}>
          {tiles.map((item, index) => (
            <button
              key={item.key}
              type="button"
              className="category-tile"
              style={{ '--stagger': index }}
              onClick={() => item.category && onCategorySelect?.(item.category)}
            >
              <img src={item.image} alt="" className="category-tile__img" />
              <span className="category-tile__name">{item.displayName}</span>
            </button>
          ))}
        </Reveal>
      )}
    </section>
  )
}

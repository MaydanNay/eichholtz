import { useEffect, useState } from 'react'
import { getCategories } from '../api/categories'
import { getCollections } from '../api/collections'
import { categoryUrl } from '../utils/categoryUrl'
import { collectionUrl } from '../utils/collectionUrl'

export default function CatalogMenu({ isOpen, onItemClick }) {
  const [columns, setColumns] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCategories(true),
      getCollections({ published: true, isNew: true })
    ]).then(([categories, newCollections]) => {
      if (cancelled) return

      const newColumns = []

      if (newCollections && newCollections.length > 0) {
        newColumns.push({
          title: 'Новинки',
          topItem: { title: 'Новинки', path: '/collections' },
          items: newCollections.map(c => ({
            title: c.name,
            path: collectionUrl(c)
          }))
        })
      }

      const topCategories = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order)
      for (const top of topCategories) {
        const subCategories = categories
          .filter(c => c.parent_id === top.id)
          .sort((a, b) => a.sort_order - b.sort_order)

        newColumns.push({
          title: top.name,
          topItem: { title: top.name, path: categoryUrl(top) },
          items: subCategories.map(c => ({
            title: c.name,
            path: categoryUrl(c)
          }))
        })
      }

      setColumns(newColumns)
    }).catch(console.error)

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className={`header__catalog-panel${isOpen ? ' header__catalog-panel--open' : ''}`}
      id="catalog-menu"
      aria-hidden={!isOpen}
    >
      <div className="header__catalog-panel-inner">
        <div className="header__catalog-grid">
          {columns.map((column) => (
            <div key={column.title} className="header__catalog-col">
              <button 
                className="header__catalog-col-title" 
                onClick={() => {
                  if (column.topItem) onItemClick(column.topItem)
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}
                tabIndex={isOpen ? 0 : -1}
              >
                {column.title}
              </button>
              <ul className="header__catalog-list">
                {column.items.map((item) => (
                  <li key={item.title}>
                    <button
                      type="button"
                      className="header__catalog-link"
                      onClick={() => onItemClick(item)}
                      tabIndex={isOpen ? 0 : -1}
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

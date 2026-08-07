import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { categoryUrl } from '../utils/categoryUrl'

function sortCategories(list) {
  return [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'ru'))
}

export default function CategoryNavPanel({ rootName, isOpen, onClose }) {
  const [categories, setCategories] = useState([])
  const [activeChildId, setActiveChildId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    getCategories(true)
      .then((data) => {
        if (!cancelled) setCategories(data || [])
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

  const root = useMemo(
    () => categories.find((c) => c.name === rootName && c.parent_id == null) || null,
    [categories, rootName],
  )

  const children = useMemo(() => {
    if (!root) return []
    return sortCategories(categories.filter((c) => c.parent_id === root.id))
  }, [categories, root])

  useEffect(() => {
    const firstWithKids = children.find((c) => categories.some((x) => x.parent_id === c.id))
    setActiveChildId(firstWithKids?.id ?? children[0]?.id ?? null)
  }, [children, categories, isOpen])

  const grandchildren = useMemo(() => {
    if (!activeChildId) return []
    return sortCategories(categories.filter((c) => c.parent_id === activeChildId))
  }, [categories, activeChildId])

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  )

  const promoCategory = activeChild || root
  const panelId = `category-menu-${String(rootName || '')
    .toLowerCase()
    .replace(/\s+/g, '-')}`

  return (
    <div
      className={`header__collections-panel${isOpen ? ' header__collections-panel--open' : ''}`}
      id={panelId}
      aria-hidden={!isOpen}
    >
      <div className="header__collections-panel-inner">
        {loading ? (
          <p className="header__collections-empty">Загрузка...</p>
        ) : !root ? (
          <p className="header__collections-empty">Категория скоро появится</p>
        ) : (
          <div className="header__category-layout">
            <div className="header__category-cols">
              <div className="header__collections-seasons">
                <ul className="header__collections-season-list">
                  {children.map((child) => {
                    const hasKids = categories.some((c) => c.parent_id === child.id)
                    return (
                      <li key={child.id}>
                        {hasKids ? (
                          <button
                            type="button"
                            className={`header__collections-season-btn header__category-parent-btn${
                              activeChildId === child.id ? ' header__collections-season-btn--active' : ''
                            }`}
                            onMouseEnter={() => setActiveChildId(child.id)}
                            onFocus={() => setActiveChildId(child.id)}
                            tabIndex={isOpen ? 0 : -1}
                          >
                            <span>{child.name}</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path
                                d="M4 2L8 6L4 10"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        ) : (
                          <Link
                            to={categoryUrl(child)}
                            className={`header__collections-season-btn${
                              activeChildId === child.id ? ' header__collections-season-btn--active' : ''
                            }`}
                            onMouseEnter={() => setActiveChildId(child.id)}
                            onFocus={() => setActiveChildId(child.id)}
                            onClick={onClose}
                            tabIndex={isOpen ? 0 : -1}
                          >
                            {child.name}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {grandchildren.length > 0 && (
                <div className="header__collections-seasons">
                  {activeChild && (
                    <Link
                      to={categoryUrl(activeChild)}
                      className="header__collections-season-btn"
                      onClick={onClose}
                      tabIndex={isOpen ? 0 : -1}
                      style={{ marginBottom: '0.35rem', fontWeight: 500 }}
                    >
                      Все {activeChild.name.toLowerCase()}
                    </Link>
                  )}
                  <ul className="header__collections-season-list">
                    {grandchildren.map((item) => (
                      <li key={item.id}>
                        <Link
                          to={categoryUrl(item)}
                          className="header__collections-season-btn"
                          onClick={onClose}
                          tabIndex={isOpen ? 0 : -1}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="header__collections-promo">
              {promoCategory && (
                <Link
                  to={categoryUrl(promoCategory)}
                  className="header__collections-promo-link"
                  onClick={onClose}
                  tabIndex={isOpen ? 0 : -1}
                >
                  {promoCategory.image_url ? (
                    <img
                      src={promoCategory.image_url}
                      alt=""
                      className="header__collections-promo-img"
                    />
                  ) : (
                    <div className="header__collections-promo-img header__collections-promo-img--empty" />
                  )}
                  <span className="header__collections-promo-caption">{promoCategory.name}</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

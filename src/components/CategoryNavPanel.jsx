import { useEffect, useMemo, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { categoryUrl, parseCategoryIdFromSlug } from '../utils/categoryUrl'

/** Display name in nav → possible DB root names */
const ROOT_NAME_ALIASES = {
  'Для улицы': ['Для улицы', 'Уличная мебель', 'Outdoor'],
}

/** Fixed mega-menu promo images (same as eichholtz.com catalog category banners) */
const ROOT_PROMO_IMAGES = {
  Мебель: '/images/categories/category-banner-furniture.jpg',
  Освещение: '/images/categories/category-banner-lighting.jpg',
  Аксессуары: '/images/categories/category-banner-accessories.jpg',
  'Для улицы': '/images/categories/category-banner-outdoor.jpg',
}

function sortCategories(list) {
  return [...list].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'ru'))
}

function findRootCategory(categories, rootName) {
  const names = new Set(ROOT_NAME_ALIASES[rootName] || [rootName])
  return categories.find((c) => names.has(c.name) && c.parent_id == null) || null
}

function buildAncestorIds(categories, categoryId) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const ids = new Set()
  let cur = byId.get(categoryId)
  while (cur) {
    ids.add(cur.id)
    if (cur.parent_id == null) break
    cur = byId.get(cur.parent_id)
  }
  return ids
}

export default function CategoryNavPanel({ rootName, isOpen, onClose }) {
  const location = useLocation()
  const [categories, setCategories] = useState([])
  const [previewChildId, setPreviewChildId] = useState(null)
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

  const root = useMemo(() => findRootCategory(categories, rootName), [categories, rootName])

  const children = useMemo(() => {
    if (!root) return []
    return sortCategories(categories.filter((c) => c.parent_id === root.id))
  }, [categories, root])

  const routeCategoryId = useMemo(() => {
    const match = matchPath('/category/:categorySlug', location.pathname)
    return parseCategoryIdFromSlug(match?.params?.categorySlug)
  }, [location.pathname])

  const routeAncestorIds = useMemo(() => {
    if (!routeCategoryId) return new Set()
    return buildAncestorIds(categories, routeCategoryId)
  }, [categories, routeCategoryId])

  const routeChildId = useMemo(() => {
    if (!root || routeAncestorIds.size === 0) return null
    if (!routeAncestorIds.has(root.id)) return null
    const child = children.find((c) => routeAncestorIds.has(c.id))
    return child?.id ?? null
  }, [root, children, routeAncestorIds])

  useEffect(() => {
    if (!isOpen) return
    if (routeChildId) {
      setPreviewChildId(routeChildId)
      return
    }
    const firstWithKids = children.find((c) => categories.some((x) => x.parent_id === c.id))
    setPreviewChildId(firstWithKids?.id ?? children[0]?.id ?? null)
  }, [children, categories, isOpen, routeChildId])

  const grandchildren = useMemo(() => {
    if (!previewChildId) return []
    return sortCategories(categories.filter((c) => c.parent_id === previewChildId))
  }, [categories, previewChildId])

  const previewChild = useMemo(
    () => children.find((c) => c.id === previewChildId) ?? null,
    [children, previewChildId],
  )

  const promoCategory = previewChild || root
  const promoImage = ROOT_PROMO_IMAGES[rootName] || root?.image_url || promoCategory?.image_url || null
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
                    const isPreview = previewChildId === child.id
                    const isCurrent = routeAncestorIds.has(child.id)
                    return (
                      <li key={child.id}>
                        <Link
                          to={categoryUrl(child)}
                          className={`header__collections-season-btn${hasKids ? ' header__category-parent-btn' : ''}${
                            isPreview ? ' header__collections-season-btn--active' : ''
                          }${isCurrent ? ' header__collections-season-btn--current' : ''}`}
                          aria-current={routeCategoryId === child.id ? 'page' : undefined}
                          onMouseEnter={() => setPreviewChildId(child.id)}
                          onFocus={() => setPreviewChildId(child.id)}
                          onClick={onClose}
                          tabIndex={isOpen ? 0 : -1}
                        >
                          {hasKids ? (
                            <>
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
                            </>
                          ) : (
                            child.name
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {grandchildren.length > 0 && (
                <div className="header__collections-seasons">
                  <ul className="header__collections-season-list">
                    {grandchildren.map((item) => {
                      const isCurrent = routeAncestorIds.has(item.id)
                      return (
                        <li key={item.id}>
                          <Link
                            to={categoryUrl(item)}
                            className={`header__collections-season-btn${
                              isCurrent ? ' header__collections-season-btn--current' : ''
                            }`}
                            aria-current={routeCategoryId === item.id ? 'page' : undefined}
                            onClick={onClose}
                            tabIndex={isOpen ? 0 : -1}
                          >
                            {item.name}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="header__collections-promo">
              {root && (
                <Link
                  to={categoryUrl(promoCategory || root)}
                  className="header__collections-promo-link"
                  onClick={onClose}
                  tabIndex={isOpen ? 0 : -1}
                >
                  {promoImage ? (
                    <img
                      src={promoImage}
                      alt=""
                      className="header__collections-promo-img"
                    />
                  ) : (
                    <div className="header__collections-promo-img header__collections-promo-img--empty" />
                  )}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

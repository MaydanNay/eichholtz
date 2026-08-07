import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { getCollections, getSeasons } from '../api/collections'
import { categoryUrl } from '../utils/categoryUrl'
import { collectionUrl } from '../utils/collectionUrl'

const CATALOG_SEASON_NAME = 'Каталоги'
const CATEGORY_ROOTS = ['Мебель', 'Освещение', 'Аксессуары', 'Для улицы']

const SECONDARY_LINKS = [
  { id: 'contract', label: 'Контракт' },
  { id: 'contacts', label: 'Контакты' },
  { id: 'catalog', label: 'Каталог' },
  { id: 'designers', label: 'Дизайнерам' },
  { id: 'events', label: 'Мероприятия' },
  { id: 'about', label: 'О компании' },
]

function sortCategories(list) {
  return [...list].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.name.localeCompare(b.name, 'ru'),
  )
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg className="header__mobile-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M4 2L8 6L4 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M8 2L4 6L8 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function buildCategoryPanel(category, title, childrenOf) {
  const children = childrenOf(category.id)
  return {
    title,
    allTo: categoryUrl(category),
    allLabel: `Все ${title.toLowerCase()}`,
    items: children.map((child) => {
      const hasKids = childrenOf(child.id).length > 0
      return {
        key: `cat-${child.id}`,
        label: child.name,
        category: child,
        hasKids,
        to: hasKids ? null : categoryUrl(child),
      }
    }),
  }
}

export default function MobileNavDrawer({ isOpen, onClose, onNavigate }) {
  const [categories, setCategories] = useState([])
  const [newCollections, setNewCollections] = useState([])
  const [stack, setStack] = useState([])

  useEffect(() => {
    if (!isOpen) {
      setStack([])
      return undefined
    }

    let cancelled = false

    Promise.all([
      getCategories(true),
      getCollections({ published: true }),
      getSeasons(true),
    ])
      .then(([cats, cols, seasons]) => {
        if (cancelled) return
        setCategories(cats || [])

        const productSeasons = (seasons || []).filter((s) => s.name !== CATALOG_SEASON_NAME)
        const preferred =
          productSeasons.find((s) => s.name?.toUpperCase() === 'NEW') || productSeasons[0] || null
        const seasonId = preferred?.id
        setNewCollections(
          seasonId
            ? (cols || []).filter((c) => String(c.season_id) === String(seasonId))
            : [],
        )
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([])
          setNewCollections([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  const rootsByName = useMemo(() => {
    const map = {}
    for (const name of CATEGORY_ROOTS) {
      map[name] = categories.find((c) => c.name === name && c.parent_id == null) || null
    }
    return map
  }, [categories])

  const childrenOf = (parentId) =>
    sortCategories(categories.filter((c) => c.parent_id === parentId))

  const panel = stack[stack.length - 1] || null

  const go = (pageId) => {
    onClose()
    onNavigate(pageId)
  }

  const openNewPanel = () => {
    setStack([
      {
        title: 'NEW',
        links: newCollections.map((collection) => ({
          key: `col-${collection.id}`,
          label: collection.name,
          to: collectionUrl(collection),
        })),
      },
    ])
  }

  const openCategoryPanel = (category, title = category.name) => {
    setStack((prev) => [...prev, buildCategoryPanel(category, title, childrenOf)])
  }

  const goBack = () => {
    setStack((prev) => prev.slice(0, -1))
  }

  const handleClose = () => {
    setStack([])
    onClose()
  }

  return (
    <div className={`header__mobile-menu${isOpen ? ' header__mobile-menu--open' : ''}`}>
      <div className="header__mobile-menu-overlay" onClick={handleClose} />
      <div className="header__mobile-menu-inner" role="dialog" aria-modal="true" aria-label="Меню">
        <div className={`header__mobile-menu-top${panel ? ' header__mobile-menu-top--panel' : ''}`}>
          {panel ? (
            <button type="button" className="header__mobile-menu-back" onClick={goBack}>
              <IconChevronLeft />
              <span>{panel.title}</span>
            </button>
          ) : (
            <span className="header__mobile-menu-top-spacer" />
          )}
          <button
            type="button"
            className="header__mobile-menu-close"
            onClick={handleClose}
            aria-label="Закрыть меню"
          >
            <IconClose />
          </button>
        </div>

        <div className="header__mobile-menu-content">
          {panel ? (
            <nav className="header__mobile-panel" aria-label={panel.title}>
              {panel.allTo && (
                <Link to={panel.allTo} className="header__mobile-panel-link" onClick={handleClose}>
                  {panel.allLabel}
                </Link>
              )}
              {panel.links?.map((link) => (
                <Link
                  key={link.key}
                  to={link.to}
                  className="header__mobile-panel-link"
                  onClick={handleClose}
                >
                  {link.label}
                </Link>
              ))}
              {panel.items?.map((item) =>
                item.hasKids ? (
                  <button
                    key={item.key}
                    type="button"
                    className="header__mobile-panel-link header__mobile-panel-link--btn"
                    onClick={() => openCategoryPanel(item.category)}
                  >
                    <span>{item.label}</span>
                    <IconChevronRight />
                  </button>
                ) : (
                  <Link
                    key={item.key}
                    to={item.to}
                    className="header__mobile-panel-link"
                    onClick={handleClose}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </nav>
          ) : (
            <>
              <nav className="header__mobile-nav" aria-label="Каталог">
                <button type="button" className="header__mobile-nav-link" onClick={openNewPanel}>
                  <span>NEW</span>
                  <IconChevronRight />
                </button>

                {CATEGORY_ROOTS.map((rootName) => {
                  const root = rootsByName[rootName]
                  return (
                    <button
                      key={rootName}
                      type="button"
                      className="header__mobile-nav-link"
                      onClick={() => {
                        if (!root) return
                        setStack([buildCategoryPanel(root, rootName, childrenOf)])
                      }}
                      disabled={!root}
                    >
                      <span>{rootName}</span>
                      <IconChevronRight />
                    </button>
                  )
                })}
              </nav>

              <nav className="header__mobile-nav-secondary" aria-label="О компании">
                {SECONDARY_LINKS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="header__mobile-nav-secondary-link"
                    onClick={() => go(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

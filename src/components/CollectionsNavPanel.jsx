import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCollections, getSeasons } from '../api/collections'
import { collectionUrl } from '../utils/collectionUrl'

const CATALOG_SEASON_NAME = 'Каталоги'

export default function CollectionsNavPanel({ isOpen, onClose }) {
  const [collections, setCollections] = useState([])
  const [seasonId, setSeasonId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([getCollections({ published: true }), getSeasons(true)])
      .then(([colsData, seasonsData]) => {
        if (cancelled) return

        const productSeasons = (seasonsData || []).filter((s) => s.name !== CATALOG_SEASON_NAME)
        const preferred =
          productSeasons.find((s) => s.name?.toUpperCase() === 'NEW') || productSeasons[0] || null

        setSeasonId(preferred?.id ?? null)
        setCollections(colsData || [])
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setCollections([])
          setSeasonId(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const menuItems = useMemo(() => {
    if (!seasonId) return []
    return collections.filter((c) => String(c.season_id) === String(seasonId))
  }, [collections, seasonId])

  useEffect(() => {
    setActiveId(menuItems[0]?.id ?? null)
  }, [menuItems])

  const activeCollection = useMemo(
    () => menuItems.find((c) => c.id === activeId) ?? null,
    [menuItems, activeId],
  )

  return (
    <div
      className={`header__collections-panel${isOpen ? ' header__collections-panel--open' : ''}`}
      id="collections-menu"
      aria-hidden={!isOpen}
    >
      <div className="header__collections-panel-inner">
        {loading ? (
          <p className="header__collections-empty">Загрузка...</p>
        ) : menuItems.length === 0 ? (
          <p className="header__collections-empty">Коллекции скоро появятся</p>
        ) : (
          <div className="header__collections-layout">
            <div className="header__collections-seasons">
              <ul className="header__collections-season-list">
                {menuItems.map((collection) => (
                  <li key={collection.id}>
                    <Link
                      to={collectionUrl(collection)}
                      className={`header__collections-season-btn${
                        activeId === collection.id ? ' header__collections-season-btn--active' : ''
                      }`}
                      onMouseEnter={() => setActiveId(collection.id)}
                      onFocus={() => setActiveId(collection.id)}
                      onClick={onClose}
                      tabIndex={isOpen ? 0 : -1}
                    >
                      {collection.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="header__collections-promo">
              {activeCollection && (
                <Link
                  to={collectionUrl(activeCollection)}
                  className="header__collections-promo-link"
                  onClick={onClose}
                  tabIndex={isOpen ? 0 : -1}
                >
                  {activeCollection.image_url ? (
                    <img
                      src={activeCollection.image_url}
                      alt=""
                      className="header__collections-promo-img"
                    />
                  ) : (
                    <div className="header__collections-promo-img header__collections-promo-img--empty" />
                  )}
                  <span className="header__collections-promo-caption">
                    {activeCollection.name}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

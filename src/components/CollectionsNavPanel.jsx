import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCollections, getSeasons } from '../api/collections'
import { collectionUrl } from '../utils/collectionUrl'

const CATALOG_SEASON_NAME = 'Каталоги'

export default function CollectionsNavPanel({ isOpen, onClose }) {
  const [seasons, setSeasons] = useState([])
  const [collections, setCollections] = useState([])
  const [activeSeasonId, setActiveSeasonId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getSeasons(true),
      getCollections({ published: true, kind: 'category' }),
    ])
      .then(([seasonsData, collectionsData]) => {
        if (cancelled) return
        const productSeasons = seasonsData.filter((season) => season.name !== CATALOG_SEASON_NAME)
        setSeasons(productSeasons)
        setCollections(collectionsData)

        const defaultSeason = productSeasons[0]
        setActiveSeasonId(defaultSeason?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setSeasons([])
          setCollections([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const activeSeason = useMemo(
    () => seasons.find((item) => item.id === activeSeasonId) ?? null,
    [seasons, activeSeasonId],
  )

  const visibleCollections = useMemo(() => {
    if (!activeSeasonId) return []
    return collections.filter((item) => item.season_id === activeSeasonId)
  }, [collections, activeSeasonId])

  return (
    <div
      className={`header__collections-panel${isOpen ? ' header__collections-panel--open' : ''}`}
      id="collections-menu"
      aria-hidden={!isOpen}
    >
      <div className="header__collections-panel-inner">
        {loading ? (
          <p className="header__collections-empty">Загрузка...</p>
        ) : seasons.length === 0 ? (
          <p className="header__collections-empty">Коллекции скоро появятся</p>
        ) : (
          <div className="header__collections-layout">
            
            {/* LEFT SIDE: Seasons List */}
            <div className="header__collections-seasons">
              <p className="header__collections-heading">Сезоны</p>
              <ul className="header__collections-season-list">
                {seasons.map((season) => (
                  <li key={season.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      className={`header__collections-season-btn${activeSeasonId === season.id ? ' header__collections-season-btn--active' : ''}`}
                      onMouseEnter={() => setActiveSeasonId(season.id)}
                      onFocus={() => setActiveSeasonId(season.id)}
                      onClick={() => setActiveSeasonId(current => current === season.id ? null : season.id)}
                      tabIndex={isOpen ? 0 : -1}
                    >
                      {season.name}
                    </button>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: activeSeasonId === season.id ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.3s ease',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                          <div className="mega-menu-preview-img" style={{ width: '100%', marginBottom: '0.5rem' }}>
                            <img 
                              src={season.image_url || '/logo.webp'} 
                              alt="" 
                              className={!season.image_url ? 'img-fallback' : ''}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/collections"
                className="header__catalogs-all-link"
                onClick={onClose}
                tabIndex={isOpen ? 0 : -1}
                style={{ marginTop: '2rem' }}
              >
                Посмотреть все коллекции
              </Link>
            </div>

            {/* RIGHT SIDE: Collections Grid */}
            <div className="header__catalogs-products-wrap">
              <div className="header__catalogs-products-head">
                <p className="header__collections-heading">
                  Коллекции сезона {activeSeason?.name}
                </p>
              </div>

              {visibleCollections.length === 0 ? (
                <p className="header__collections-empty">В этом сезоне пока нет коллекций</p>
              ) : (
                <ul className="header__catalogs-products">
                  {visibleCollections.map((collection) => (
                    <li key={collection.id}>
                      <Link
                        to={collectionUrl(collection)}
                        className="header__catalogs-product"
                        onClick={onClose}
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <div className="mega-menu-preview-img" style={{ width: '100%', marginBottom: '0.75rem' }}>
                          <img 
                            src={collection.image_url || '/logo.webp'} 
                            alt="" 
                            className={!collection.image_url ? 'img-fallback' : ''}
                          />
                        </div>
                        <span className="header__catalogs-product-name">{collection.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

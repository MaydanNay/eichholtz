import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCollections, getSeasons } from '../api/collections'
import { collectionUrl } from '../utils/collectionUrl'
import Reveal from '../components/Reveal'

const CATALOG_SEASON_NAME = 'Каталоги'

export default function AllCollectionsPage() {
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

        if (productSeasons.length > 0) {
          setActiveSeasonId(productSeasons[0].id)
        }
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

  const visibleCollections = useMemo(() => {
    if (!activeSeasonId) return []
    return collections.filter((item) => item.season_id === activeSeasonId)
  }, [collections, activeSeasonId])

  return (
    <div className="catalogues-page">
      <Reveal className="catalogues-page__hero reveal-stagger" variant="blur-up">
        <h1 className="all-collections-page__title" style={{ '--stagger': 0 }}>
          ВСЕ <em>наши</em> КОЛЛЕКЦИИ
        </h1>
        <p className="catalogues-page__intro" style={{ '--stagger': 1 }}>
          Ознакомьтесь с актуальными коллекциями по сезонам.
        </p>
      </Reveal>

      {loading ? (
        <p className="catalogs__empty">Загрузка...</p>
      ) : seasons.length === 0 ? (
        <p className="catalogs__empty">Коллекции пока не добавлены</p>
      ) : (
        <div className="all-collections-page__content">
          <Reveal className="all-collections-page__tabs reveal-stagger" variant="up" delay={80}>
            {seasons.map((season, index) => (
              <button
                key={season.id}
                type="button"
                className={`all-collections-page__tab${activeSeasonId === season.id ? ' all-collections-page__tab--active' : ''}`}
                onClick={() => setActiveSeasonId(season.id)}
                style={{
                  '--stagger': index
                }}
              >
                {season.name}
              </button>
            ))}
          </Reveal>

          {visibleCollections.length === 0 ? (
            <p className="catalogs__empty" style={{ marginTop: '3rem' }}>
              В этом сезоне пока нет коллекций
            </p>
          ) : (
            <Reveal className="catalogues-page__grid reveal-stagger" variant="up" delay={120}>
              {visibleCollections.map((collection, index) => (
                <Link
                  key={collection.id}
                  to={collectionUrl(collection)}
                  className="catalogues-page__card"
                  style={{ '--stagger': index }}
                >
                  <span className="catalogues-page__card-media" style={{ position: 'relative' }}>
                    {collection.image_url ? (
                      <img
                        src={collection.image_url}
                        alt=""
                        className="catalogues-page__card-img"
                      />
                    ) : (
                      <img
                        src="/logo.webp"
                        alt="Eichholtz"
                        className="catalogues-page__card-img catalogues-page__card-img--default"
                      />
                    )}
                  </span>
                  <p className="catalogues-page__card-title">{collection.name}</p>
                </Link>
              ))}
            </Reveal>
          )}
        </div>
      )}
    </div>
  )
}

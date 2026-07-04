import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { getHomeCollections, getSeasons, getCollections } from '../api/collections'
import { getHomeSettings } from '../api/homeSettings'
import { collectionUrl } from '../utils/collectionUrl'
import { SITE_IMAGES } from '../data/siteImages'
import Reveal from '../components/Reveal'

function getCategoryImage(item, index) {
  if (item.image_url) return item.image_url
  return SITE_IMAGES.category
}

function SwitcherArrow({ direction }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {direction === 'prev' ? (
        <path d="M11.5 3.5 6 9l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      ) : (
        <path d="M6.5 3.5 12 9l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      )}
    </svg>
  )
}

const CATALOG_SEASON_NAME = 'Каталоги'

function SeasonSwitcher({ value, onPrev, onNext, canSwitch }) {
  return (
    <div className="collection__switcher collection__switcher--season">
      <button
        type="button"
        className="collection__switcher-btn"
        onClick={onPrev}
        disabled={!canSwitch}
        aria-label="Предыдущий сезон"
      >
        <SwitcherArrow direction="prev" />
      </button>
      <span className="collection__switcher-value">{value}</span>
      <button
        type="button"
        className="collection__switcher-btn"
        onClick={onNext}
        disabled={!canSwitch}
        aria-label="Следующий сезон"
      >
        <SwitcherArrow direction="next" />
      </button>
    </div>
  )
}

function CollectionPreviewHover({ collection, mousePos, onMouseEnter, onMouseLeave, isPreview }) {
  const [catalogs, setCatalogs] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCollections({ kind: 'catalog' })
      .then(data => {
        if (!cancelled) {
          setCatalogs(data.filter(c => String(c.parent_collection_id) === String(collection.id)))
        }
      })
      .catch(() => {
        if (!cancelled) setCatalogs([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    
    return () => { cancelled = true }
  }, [collection.id])

  const tooltipWidthStr = '80vw'
  const halfWidthPx = window.innerWidth * 0.4
  const x = Math.min(Math.max(mousePos.x, halfWidthPx + 10), window.innerWidth - halfWidthPx - 10)
  
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: mousePos.y + 20,
        left: x,
        transform: 'translateX(-50%)',
        background: 'var(--color-white)',
        border: '1px solid var(--color-gray)',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '1.5rem',
        borderRadius: '0',
        zIndex: 99999,
        width: tooltipWidthStr,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1.1rem', borderBottom: '1px solid var(--color-gray)', paddingBottom: '0.75rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {collection.name}
        {collection.is_new && (
          <span style={{ background: '#b78b5e', color: '#fff', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '0', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>Новинка</span>
        )}
      </div>
      {loading ? (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-text)', textAlign: 'center' }}>Загрузка каталогов...</p>
      ) : catalogs && catalogs.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
          {catalogs.slice(0, 12).map(cat => {
            const inner = (
              <>
                <div className="tooltip-catalog-image" style={{ width: '90px', height: '160px', borderRadius: '0', background: 'var(--color-gray)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}>
                  <img 
                    src={cat.image_url || '/logo.webp'} 
                    alt="" 
                    style={cat.image_url ? { width: '100%', height: '100%', objectFit: 'cover' } : { width: '100%', height: '100%', objectFit: 'contain', padding: '15%' }} 
                  />
                </div>
                <span className="tooltip-catalog-title" style={{ fontSize: '0.85rem', textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'inherit', transition: 'color 0.3s ease' }}>{cat.name}</span>
              </>
            );
            return (
              <li key={cat.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '90px' }}>
                {cat.pdf_url ? (
                  <a href={cat.pdf_url} target="_blank" rel="noopener noreferrer" className="tooltip-catalog-link" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    {inner}
                  </a>
                ) : (
                  <div className="tooltip-catalog-link" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
          {catalogs.length > 12 && (
            <li style={{ fontSize: '0.9rem', color: 'var(--color-gray-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
              и еще {catalogs.length - 12}...
            </li>
          )}
        </ul>
      ) : (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-gray-text)', textAlign: 'center' }}>В этой коллекции нет каталогов</p>
      )}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <Link
          to={collectionUrl(collection)}
          className="link-underline"
          onClick={e => isPreview && e.preventDefault()}
          style={{ fontSize: '0.9rem' }}
        >
          Посмотреть коллекцию
        </Link>
      </div>
    </div>
  )
}

export default function CollectionSection({ onCategorySelect, isPreview = false }) {
  const [homeCollections, setHomeCollections] = useState([])
  const [seasons, setSeasons] = useState([])
  const [categories, setCategories] = useState([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [block2Title, setBlock2Title] = useState('')
  const [seasonIndex, setSeasonIndex] = useState(0)
  const [collectionIndex, setCollectionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hoveredCollection, setHoveredCollection] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const hoverTimeoutRef = useRef(null)

  const handleMouseEnter = (item, e) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHoveredCollection(item)
    if (e && e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      setMousePos({ 
        x: rect.left + rect.width / 2, 
        y: rect.bottom
      })
    }
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCollection(null)
    }, 300)
  }

  useEffect(() => {
    if (!hoveredCollection) return
    
    const onScroll = () => {
      setHoveredCollection(null)
    }
    
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hoveredCollection])

  useEffect(() => {
    Promise.all([
      getHomeCollections(),
      getSeasons(true, true),
      getHomeSettings()
    ])
      .then(([collectionItems, seasonsData, settings]) => {
        const productSeasons = seasonsData.filter((season) => season.name !== CATALOG_SEASON_NAME)
        setHomeCollections(collectionItems)
        setSeasons(productSeasons)
        setBlock2Title(settings.block2_title || '')

        const defaultSeasonIndex = productSeasons.findIndex((season) =>
          collectionItems.some((item) => item.season_id === season.id),
        )
        setSeasonIndex(defaultSeasonIndex >= 0 ? defaultSeasonIndex : 0)
      })
      .catch(() => {
        setHomeCollections([])
        setSeasons([])
        setCategories([])
      })
      .finally(() => setLoading(false))
  }, [])

  const seasonCollections = useMemo(() => {
    const season = seasons[seasonIndex]
    if (!season) return homeCollections
    return homeCollections.filter((item) => item.season_id === season.id)
  }, [homeCollections, seasons, seasonIndex])

  useEffect(() => {
    setCollectionIndex(0)
  }, [seasonIndex, seasonCollections.length])

  const activeCollection = seasonCollections[collectionIndex] || null
  const canSwitchSeasons = seasons.length > 1
  const seasonLabel = seasons[seasonIndex]?.name || '—'

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const catData = await getCategories(true, activeCollection?.id)
        if (!cancelled) {
          setCategories(catData)
        }
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [activeCollection?.id])

  const goToPrevSeason = () => {
    setSeasonIndex((index) => (index - 1 + seasons.length) % seasons.length)
  }

  const goToNextSeason = () => {
    setSeasonIndex((index) => (index + 1) % seasons.length)
  }

  const topLevelCategories = useMemo(() => {
    return categories.filter(c => !c.parent_id)
  }, [categories])

  const visibleCategories = showAllCategories ? topLevelCategories : topLevelCategories.slice(0, 8)
  const hasMoreCategories = topLevelCategories.length > 8

  return (
    <section className="collection" id="collection">
      <Reveal className="collection__intro" variant="up">
        {loading ? (
          <p className="collection__empty" style={{ padding: 0 }}>Загрузка...</p>
        ) : homeCollections.length === 0 ? (
          <p className="collection__empty" style={{ padding: 0 }}>Коллекции скоро появятся</p>
        ) : (
          <div className="collection__picker">
            {block2Title && (
              <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem', fontWeight: 400 }}>
                {block2Title}
              </h2>
            )}
            <SeasonSwitcher
              value={seasonLabel}
              onPrev={goToPrevSeason}
              onNext={goToNextSeason}
              canSwitch={canSwitchSeasons}
            />

            {seasonCollections.length > 0 ? (
              <>
                <div className="collection__names-scroll-wrap">
                  {seasonCollections.length > 4 ? (
                    <div className="collection__names-marquee" role="tablist" aria-label="Коллекции">
                      <div className="marquee-content">
                        {seasonCollections.map((item, index) => (
                          <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={index === collectionIndex}
                            className={`collection__name-tab${index === collectionIndex ? ' collection__name-tab--active' : ''}`}
                            onClick={() => setCollectionIndex(index)}
                            onMouseEnter={(e) => handleMouseEnter(item, e)}
                            onMouseLeave={handleMouseLeave}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                      <div className="marquee-content" aria-hidden="true">
                        {seasonCollections.map((item, index) => (
                          <button
                            key={item.id + '_dup'}
                            type="button"
                            role="tab"
                            aria-selected={index === collectionIndex}
                            className={`collection__name-tab${index === collectionIndex ? ' collection__name-tab--active' : ''}`}
                            onClick={() => setCollectionIndex(index)}
                            onMouseEnter={(e) => handleMouseEnter(item, e)}
                            onMouseLeave={handleMouseLeave}
                            tabIndex="-1"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="collection__names-scroll" role="tablist" aria-label="Коллекции">
                      {seasonCollections.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          role="tab"
                          aria-selected={index === collectionIndex}
                          className={`collection__name-tab${index === collectionIndex ? ' collection__name-tab--active' : ''}`}
                          onClick={() => setCollectionIndex(index)}
                          onMouseEnter={(e) => handleMouseEnter(item, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {activeCollection && (
                  <div className="collection__picker-action">
                    <Link
                      to="/collections"
                      className="link-underline"
                      onClick={e => isPreview && e.preventDefault()}
                    >
                      Посмотреть все коллекции
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="collection__empty" style={{ padding: 0 }}>
                В этом сезоне пока нет коллекций на главной
              </p>
            )}
          </div>
        )}
      </Reveal>



      {loading ? null : topLevelCategories.length === 0 ? (
        <p className="collection__empty">Категории скоро появятся</p>
      ) : (
        <>
          <Reveal as="div" className="category-grid reveal-stagger" variant="up" delay={120}>
            {visibleCategories.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="category-tile"
                style={{ '--stagger': index }}
                onClick={() => onCategorySelect?.(item)}
              >
                <img
                  src={getCategoryImage(item, index)}
                  alt=""
                  className="category-tile__img"
                />
                <span className="category-tile__name">{item.name}</span>
              </button>
            ))}
          </Reveal>
          {hasMoreCategories && !showAllCategories && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                type="button" 
                className="btn btn--outline" 
                onClick={() => setShowAllCategories(true)}
              >
                Посмотреть все категории
              </button>
            </div>
          )}
        </>
      )}

      {hoveredCollection && createPortal(
          <CollectionPreviewHover 
            collection={hoveredCollection} 
            mousePos={mousePos} 
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
            }}
            onMouseLeave={handleMouseLeave}
            isPreview={isPreview}
          />,
        document.body
      )}
    </section>
  )
}

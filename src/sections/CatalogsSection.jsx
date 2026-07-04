import { useEffect, useState } from 'react'
import { api } from '../admin/api'
import Reveal from '../components/Reveal'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return isMobile
}

export default function CatalogsSection({ onNavigate }) {
  const [catalogs, setCatalogs] = useState([])
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  // Mobile carousel states
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)

  useEffect(() => {
    api.getCollections({ published: true, kind: 'catalog' })
      .then(data => setCatalogs(data.slice(0, 6)))
      .catch(() => setCatalogs([]))
      .finally(() => setLoading(false))
  }, [])

  const maxIndex = catalogs.length - 1

  const goNext = () => {
    setIndex((current) => (current >= maxIndex ? 0 : current + 1))
  }
  
  const goPrev = () => {
    setIndex((current) => (current <= 0 ? maxIndex : current - 1))
  }

  // Autoplay on mobile
  useEffect(() => {
    if (!isMobile || catalogs.length <= 1) return undefined
    const timer = setInterval(() => {
      goNext()
    }, 5000)
    return () => clearInterval(timer)
  }, [isMobile, catalogs.length, maxIndex])

  // Reset index if we toggle between mobile/desktop
  useEffect(() => {
    setIndex(0)
  }, [isMobile])

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return
    const diff = touchStartX - touchEndX
    if (diff > 50) {
      goNext()
    } else if (diff < -50) {
      goPrev()
    }
    setTouchStartX(0)
    setTouchEndX(0)
  }

  const handleSelect = (item) => {
    if (item.pdf_url) {
      window.open(item.pdf_url, '_blank', 'noopener,noreferrer')
      return
    }

    onNavigate?.('catalogs')
  }

  return (
    <section className="catalogs" id="catalogs">
      <Reveal variant="blur-up">
        <h2 className="catalogs__title section-heading">Откройте наши каталоги</h2>
      </Reveal>

      {loading ? (
        <p className="catalogs__empty">Загрузка...</p>
      ) : catalogs.length === 0 ? (
        <p className="catalogs__empty">Каталоги пока не добавлены</p>
      ) : (
        <>
          {isMobile ? (
            <div className="catalogs__mobile-carousel">
              <div
                className="catalogs__viewport"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div
                  className="catalogs__track"
                  style={{
                    transform: `translateX(-${index * 100}%)`,
                  }}
                >
                  {catalogs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="catalog-card"
                      onClick={() => handleSelect(item)}
                      style={{ flex: '0 0 100%', width: '100%', boxSizing: 'border-box', padding: '0 0.5rem' }}
                    >
                      <span className="catalog-card__media">
                        <img
                          src={item.image_url}
                          alt=""
                          className="catalog-card__img"
                        />
                      </span>
                      <p className="catalog-card__title">{item.name}</p>
                    </button>
                  ))}
                </div>
              </div>
              {catalogs.length > 1 && (
                <div className="catalogs__dots">
                  {catalogs.map((_, dotIndex) => (
                    <button
                      key={dotIndex}
                      type="button"
                      className={`catalogs__dot${dotIndex === index ? ' catalogs__dot--active' : ''}`}
                      onClick={() => setIndex(dotIndex)}
                      aria-label={`Каталог ${dotIndex + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Reveal className="catalogs__grid reveal-stagger" variant="up" delay={100}>
              {catalogs.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="catalog-card"
                  style={{ '--stagger': index }}
                  onClick={() => handleSelect(item)}
                >
                  <span className="catalog-card__media">
                    <img
                      src={item.image_url}
                      alt=""
                      className="catalog-card__img"
                    />
                  </span>
                  <p className="catalog-card__title">{item.name}</p>
                </button>
              ))}
            </Reveal>
          )}

          <Reveal variant="fade" delay={240}>
            <button
              type="button"
              className="link-underline catalogs__link"
              onClick={() => onNavigate?.('catalogs')}
            >
              Посмотреть все каталоги
            </button>
          </Reveal>
        </>
      )}
    </section>
  )
}

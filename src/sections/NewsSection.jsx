import { useEffect, useState } from 'react'
import { api } from '../admin/api'
import Reveal from '../components/Reveal'

const AUTOPLAY_MS = 6000

function useVisibleCount() {
  const [count, setCount] = useState(3)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const update = () => setCount(mq.matches ? 1 : 3)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return count
}

export default function NewsSection({ onOpenNews, onNavigate }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const visibleCount = useVisibleCount()

  useEffect(() => {
    api.getNews(true)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setIndex(0)
  }, [news.length, visibleCount])

  const maxIndex = Math.max(0, news.length - visibleCount)
  const canSlide = news.length > visibleCount

  useEffect(() => {
    if (!canSlide || paused) return undefined

    const timer = setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1))
    }, AUTOPLAY_MS)

    return () => clearInterval(timer)
  }, [canSlide, maxIndex, paused])

  const goPrev = () => {
    setIndex((current) => (current <= 0 ? maxIndex : current - 1))
  }

  const goNext = () => {
    setIndex((current) => (current >= maxIndex ? 0 : current + 1))
  }

  const [touchStartX, setTouchStartX] = useState(0)
  const [touchEndX, setTouchEndX] = useState(0)

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

  return (
    <section className="news" id="news">
      <Reveal variant="blur-up">
        <h2 className="news__title section-heading">Новости EICHHOLTZ Казахстан</h2>
      </Reveal>

      {!loading && news.length > 0 && (
        <Reveal variant="fade" delay={80}>
          <button
            type="button"
            className="link-underline news__all-link"
            onClick={() => onNavigate?.('events')}
          >
            Все новости
          </button>
        </Reveal>
      )}

      {loading ? (
        <p className="news__empty">Загрузка...</p>
      ) : news.length === 0 ? (
        <p className="news__empty">Новости пока не загружены</p>
      ) : (
        <Reveal variant="up" delay={120}>
        <div
          className="news__carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {canSlide && (
            <button
              type="button"
              className="news__nav news__nav--prev"
              onClick={goPrev}
              aria-label="Предыдущие новости"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11 3L5 9l6 6" />
              </svg>
            </button>
          )}

          <div className="news__viewport">
            <div
              className="news__track"
              style={{
                transform: `translateX(-${index * (100 / visibleCount)}%)`,
                '--news-visible': visibleCount,
              }}
            >
              {news.map((item) => (
                <article key={item.id} className="news-card">
                  <button
                    type="button"
                    className="news-card__link"
                    onClick={() => onOpenNews?.(item.id)}
                  >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="news-card__img" />
                  ) : (
                    <div className="news-card__placeholder" />
                  )}
                  <div className="news-card__body">
                    <time className="news-card__date">
                      {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </time>
                    <h3 className="news-card__title">{item.title}</h3>
                    {item.content && <p className="news-card__text">{item.content}</p>}
                  </div>
                  </button>
                </article>
              ))}
            </div>
          </div>

          {canSlide && (
            <button
              type="button"
              className="news__nav news__nav--next"
              onClick={goNext}
              aria-label="Следующие новости"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7 3l6 6-6 6" />
              </svg>
            </button>
          )}

          {canSlide && (
            <div className="news__dots">
              {Array.from({ length: maxIndex + 1 }, (_, dotIndex) => (
                <button
                  key={dotIndex}
                  type="button"
                  className={`news__dot${dotIndex === index ? ' news__dot--active' : ''}`}
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Новости ${dotIndex + 1}`}
                />
              ))}
            </div>
          )}
        </div>
        </Reveal>
      )}
    </section>
  )
}

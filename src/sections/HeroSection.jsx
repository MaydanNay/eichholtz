import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHeroCollections } from '../api/collections'
import { collectionUrl } from '../utils/collectionUrl'
import { getCollectionImage } from '../utils/collectionImage'
import { SITE_IMAGES } from '../data/siteImages'

const FALLBACK_SLIDES = [
  {
    id: 'fallback-1',
    name: 'Коллекция зима 2025',
    season_name: 'Зима 2026',
    image_url: SITE_IMAGES.hero[0],
    kind: 'category',
  },
  {
    id: 'fallback-2',
    name: 'The Met × Eichholtz',
    season_name: 'Зима 2026',
    image_url: SITE_IMAGES.hero[1],
    kind: 'category',
  },
  {
    id: 'fallback-3',
    name: 'Коллекция январь 2026',
    season_name: 'Зима 2026',
    image_url: SITE_IMAGES.hero[2],
    kind: 'category',
  },
]

export default function HeroSection({ isPreview = false }) {
  const [slides, setSlides] = useState(FALLBACK_SLIDES)
  const [active, setActive] = useState(0)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    getHeroCollections()
      .then((items) => {
        if (items.length > 0) setSlides(items)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setActive((index) => (slides.length ? index % slides.length : 0))
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1) return undefined

    const timer = setInterval(() => {
      setActive((index) => (index + 1) % slides.length)
    }, 6000)

    return () => clearInterval(timer)
  }, [slides.length])

  const current = slides[active] || slides[0]

  return (
    <section className={`hero${entered ? ' hero--entered' : ''}`}>
      <div className="hero__slides">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`hero__slide${index === active ? ' hero__slide--active' : ''}`}
          >
            <img
              src={getCollectionImage(slide, index)}
              alt=""
              className="hero__bg"
            />
          </div>
        ))}
      </div>

      <div className="hero__overlay">
        {current && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
              {current.season_name && (
                <p key={`${current.id}-season`} className="hero__season hero__title--animate" style={{ margin: 0 }}>
                  {current.season_name}
                </p>
              )}
            </div>
            <h1 key={current.id} className="hero__title hero__title--animate">
              {current.name}
            </h1>
            <Link
              to={collectionUrl(current)}
              className="link-underline hero__cta hero__cta--animate"
              onClick={e => isPreview && e.preventDefault()}
            >
              Смотреть коллекцию
            </Link>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="hero__dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`hero__dot${index === active ? ' hero__dot--active' : ''}`}
              onClick={() => setActive(index)}
              aria-label={`Слайд ${index + 1}: ${slide.name}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

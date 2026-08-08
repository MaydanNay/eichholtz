import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHeroCollections } from '../api/collections'
import { getHomeSettings } from '../api/homeSettings'
import {
  isExternalLink,
  parseHeroSlides,
  slideImage,
  slidesFromHeroCollections,
} from '../utils/heroSlides'
import { SITE_IMAGES } from '../data/siteImages'

const FALLBACK_SLIDES = [
  {
    id: 'fallback-1',
    title: 'Коллекция зима 2025',
    subtitle: 'Зима 2026',
    image_url: SITE_IMAGES.hero[0],
    link: '/collections',
  },
  {
    id: 'fallback-2',
    title: 'The Met × Eichholtz',
    subtitle: 'Зима 2026',
    image_url: SITE_IMAGES.hero[1],
    link: '/collections',
  },
  {
    id: 'fallback-3',
    title: 'Коллекция январь 2026',
    subtitle: 'Зима 2026',
    image_url: SITE_IMAGES.hero[2],
    link: '/collections',
  },
]

function normalizeOverrideSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) return null
  return slides
    .map((slide, index) => ({
      id: slide.id || `slide-${index + 1}`,
      subtitle: slide.subtitle || '',
      title: slide.title || '',
      image_url: slide.image_url || '',
      link: slide.link || '',
      collection_id: slide.collection_id ?? null,
    }))
    .filter((slide) => slide.title || slide.image_url || slide.link)
}

export default function HeroSection({ isPreview = false, slidesOverride = null }) {
  const override = useMemo(() => normalizeOverrideSlides(slidesOverride), [slidesOverride])
  const [slides, setSlides] = useState(override || FALLBACK_SLIDES)
  const [active, setActive] = useState(0)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (override && override.length > 0) {
      setSlides(override)
      return undefined
    }

    let cancelled = false

    async function load() {
      try {
        const settings = await getHomeSettings()
        let next = null
        if (settings.hero_slides != null && String(settings.hero_slides).trim() !== '') {
          next = parseHeroSlides(settings.hero_slides)
        }
        if (!next || next.length === 0) {
          const collections = await getHeroCollections()
          next = slidesFromHeroCollections(collections)
        }
        if (!cancelled && next.length > 0) setSlides(next)
      } catch {
        // keep fallbacks
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [override])

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
  const ctaLink = (current?.link || '').trim() || '/collections'
  const ctaIsExternal = isExternalLink(ctaLink)

  const ctaProps = {
    className: 'link-underline hero__cta hero__cta--animate',
    onClick: (e) => isPreview && e.preventDefault(),
  }

  return (
    <section className={`hero${entered ? ' hero--entered' : ''}`}>
      <div className="hero__slides">
        {slides.map((slide, index) => (
          <div
            key={`${slide.id}-${slide.image_url || index}`}
            className={`hero__slide${index === active ? ' hero__slide--active' : ''}`}
          >
            <img
              src={slideImage(slide, index)}
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
              {current.subtitle && (
                <p key={`${current.id}-season`} className="hero__season hero__title--animate" style={{ margin: 0 }}>
                  {current.subtitle}
                </p>
              )}
            </div>
            <h1 key={current.id} className="hero__title hero__title--animate">
              {current.title}
            </h1>
            {ctaIsExternal ? (
              <a
                href={ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                {...ctaProps}
              >
                Смотреть коллекцию
              </a>
            ) : (
              <Link to={ctaLink} {...ctaProps}>
                Смотреть коллекцию
              </Link>
            )}
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
              aria-label={`Слайд ${index + 1}: ${slide.title}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

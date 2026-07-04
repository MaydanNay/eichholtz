import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../admin/api'
import Reveal from '../components/Reveal'
import DesignersInquiryModal from '../components/DesignersInquiryModal'
import { CATALOGUES_INTRO } from '../data/catalogues'

export default function CataloguesPage() {
  const location = useLocation()
  const [catalogs, setCatalogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    api.getCollections({ published: true, kind: 'catalog' })
      .then(setCatalogs)
      .catch(() => setCatalogs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (location.hash === '#catalogues-form') {
      setIsFormOpen(true)
    }
  }, [location.hash])

  return (
    <div className="catalogues-page">
      <Reveal className="catalogues-page__hero reveal-stagger" variant="blur-up">
        <h1 className="catalogues-page__title" style={{ '--stagger': 0 }}>
          ОТКРОЙТЕ <em>наши</em> КАТАЛОГИ
        </h1>
        <p className="catalogues-page__intro" style={{ '--stagger': 1 }}>{CATALOGUES_INTRO}</p>
      </Reveal>

      {loading ? (
        <p className="catalogs__empty">Загрузка...</p>
      ) : catalogs.length === 0 ? (
        <p className="catalogs__empty">Каталоги пока не добавлены</p>
      ) : (
        <Reveal className="catalogues-page__grid reveal-stagger" variant="up" delay={80}>
          {catalogs.map((item, index) => {
            const CardTag = item.pdf_url ? 'a' : 'div'
            const cardProps = item.pdf_url
              ? {
                  href: item.pdf_url,
                  target: '_blank',
                  rel: 'noreferrer',
                }
              : {}

            return (
              <CardTag
                key={item.id}
                {...cardProps}
                className="catalogues-page__card"
                style={{ '--stagger': index }}
              >
                <span className="catalogues-page__card-media">
                  <img
                    src={item.image_url || '/logo.webp'}
                    alt=""
                    className={`catalogues-page__card-img ${!item.image_url ? 'img-fallback' : ''}`}
                  />
                </span>
                <p className="catalogues-page__card-title">{item.name}</p>
              </CardTag>
            )
          })}
        </Reveal>
      )}

      <Reveal as="section" className="catalogues-page__form" variant="blur-up" id="catalogues-form">
        <h2 className="catalogues-page__form-title section-heading">ФОРМА ЗАЯВКИ</h2>
        <p className="catalogues-page__form-lead">
          Присоединяйтесь к программе и получите доступ
          <br />
          ко всем преимуществам.
        </p>
        <button type="button" className="designers-form__open-btn" onClick={() => setIsFormOpen(true)}>
          Заполнить форму
        </button>
      </Reveal>

      <DesignersInquiryModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  )
}

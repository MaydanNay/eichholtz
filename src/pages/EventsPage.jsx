import { useEffect, useState } from 'react'
import { api } from '../admin/api'
import Reveal from '../components/Reveal'
import DesignersInquiryModal from '../components/DesignersInquiryModal'

const INTRO =
  'Когда в 1992 году основатель Тео Айххольц создал бренд, названный в его честь, ' +
  'его целью было привезти в Европу лучшие азиатские аксессуары и мебель.'

const PAGE_SIZE = 9

export default function EventsPage({ onOpenNews }) {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    api.getNews(true)
      .then(setNews)
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [])

  const shown = news.slice(0, visible)
  const hasMore = visible < news.length

  return (
    <div className="events-page">
      <Reveal className="events-page__hero reveal-stagger" variant="blur-up">
        <h1 className="events-page__title" style={{ '--stagger': 0 }}>
          НОВОСТИ <em>и</em> СОБЫТИЯ
        </h1>
        <p className="events-page__intro" style={{ '--stagger': 1 }}>{INTRO}</p>
      </Reveal>

      {loading ? (
        <p className="events-page__status">Загрузка...</p>
      ) : news.length === 0 ? (
        <p className="events-page__status">Новости пока не опубликованы</p>
      ) : (
        <>
          <Reveal className="events-page__grid reveal-stagger" variant="up" delay={80}>
            {shown.map((item, index) => (
              <article
                key={item.id}
                className="events-card"
                style={{ '--stagger': index % PAGE_SIZE }}
              >
                <button
                  type="button"
                  className="events-card__link"
                  onClick={() => onOpenNews(item.id)}
                >
                  <div className="events-card__media">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="events-card__img" />
                    ) : (
                      <div className="events-card__placeholder" />
                    )}
                    <span className="events-card__tag">Журнал</span>
                  </div>
                  <div className="events-card__body">
                    <h2 className="events-card__title">{item.title}</h2>
                    {item.content && (
                      <p className="events-card__text">{item.content}</p>
                    )}
                    <time className="events-card__date">
                      {new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                </button>
              </article>
            ))}
          </Reveal>

          {hasMore && (
            <Reveal className="events-page__more-wrap" variant="fade" delay={120}>
              <button
                type="button"
                className="events-page__more"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Показать ещё
              </button>
            </Reveal>
          )}
        </>
      )}

      <Reveal as="section" className="catalogues-page__form" variant="blur-up">
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

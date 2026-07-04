import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Reveal from '../components/Reveal'
import DesignersInquiryModal from '../components/DesignersInquiryModal'
import {
  DESIGNER_AUDIENCE,
  DESIGNER_FEATURES,
  DESIGNER_INFO_ASPECT,
  DESIGNER_INFO_IMAGE,
  DESIGNER_OUTRO_ASPECT,
  DESIGNER_OUTRO_IMAGE,
  DESIGNER_STEPS,
} from '../data/designers'

function FeatureTitle({ title }) {
  if (Array.isArray(title)) {
    return (
      <h2 className="designers-row__title">
        {title.map((line) => (
          <span key={line} className="designers-row__title-line">{line}</span>
        ))}
      </h2>
    )
  }

  return <h2 className="designers-row__title">{title}</h2>
}

function FeatureContent({ feature }) {
  return (
    <div className="designers-row__text-inner">
      <FeatureTitle title={feature.title} />

      {feature.paragraphs?.map((text) => (
        <p key={text} className="designers-row__paragraph">{text}</p>
      ))}

      {feature.intro && <p className="designers-row__paragraph">{feature.intro}</p>}

      {feature.list && (
        <ul className="designers-row__list">
          {feature.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      {feature.subsections?.map((section) => (
        <div key={Array.isArray(section.title) ? section.title.join(' ') : section.title} className="designers-row__subsection">
          <FeatureTitle title={section.title} />
          {section.intro && <p className="designers-row__paragraph">{section.intro}</p>}
          {section.list && (
            <ul className="designers-row__list">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

export default function DesignersPage() {
  const location = useLocation()
  const [isFormOpen, setIsFormOpen] = useState(false)

  useEffect(() => {
    if (location.hash === '#designers-form') {
      setIsFormOpen(true)
    }
  }, [location.hash])

  const openForm = () => setIsFormOpen(true)
  const closeForm = () => setIsFormOpen(false)

  return (
    <div className="designers-page">
      <Reveal as="section" className="designers-hero reveal-stagger" variant="blur-up">
        <h1 className="designers-hero__title" style={{ '--stagger': 0 }}>
          <span className="designers-hero__title-line">ПРОГРАММА ЛОЯЛЬНОСТИ</span>
          <span className="designers-hero__title-line designers-hero__title-line--small">
            <em>для </em>ДИЗАЙНЕРОВ<em> и </em>АРХИТЕКТОРОВ
          </span>
        </h1>
        <p className="designers-hero__subtitle" style={{ '--stagger': 1 }}>
          Для тех, кто создает пространство со смыслом
        </p>
      </Reveal>

      <Reveal as="section" className="designers-intro" variant="up">
        <p>
          Вы формируете атмосферу, проектируете, подбираете решения.
          Мы — обеспечиваем подбор, сопровождение, сервис и доступ к премиальным
          коллекциям мировых брендов.
        </p>
        <p>
          Партнерская программа Eichholtz создана для того, чтобы сделать вашу работу
          проще, быстрее и выгоднее — без хаоса в логистике, сложных поставок и
          бесконечных уточнений. Партнерство, которое усиливает ваши проекты и ваш бренд.
        </p>
      </Reveal>

      {DESIGNER_FEATURES.map((feature, index) => (
        <section
          key={feature.title}
          className={`designers-row${feature.imageLeft ? ' designers-row--image-left' : ' designers-row--text-left'}`}
        >
          <Reveal
            className="designers-row__image"
            variant={feature.imageLeft ? 'left' : 'right'}
            delay={index * 30}
            style={{ '--image-aspect': feature.imageAspect }}
          >
            <img src={feature.image} alt="" />
          </Reveal>
          <Reveal
            className="designers-row__text"
            variant={feature.imageLeft ? 'right' : 'left'}
            delay={index * 30 + 80}
          >
            <FeatureContent feature={feature} />
          </Reveal>
        </section>
      ))}

      <section className="designers-info">
        <Reveal className="designers-info__content" variant="left">
          <div className="designers-info__block">
            <h2 className="designers-info__title section-heading section-heading--left">
              ДЛЯ КОГО ПРОГРАММА
            </h2>
            <ul className="designers-info__list">
              {DESIGNER_AUDIENCE.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  {item.note && <span className="designers-info__note">{item.note}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="designers-info__block">
            <h2 className="designers-info__title section-heading section-heading--left">
              КАК ЭТО РАБОТАЕТ
            </h2>
            <ol className="designers-info__steps">
              {DESIGNER_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal
          className="designers-info__media"
          variant="right"
          delay={120}
          style={{ '--image-aspect': DESIGNER_INFO_ASPECT }}
        >
          <img src={DESIGNER_INFO_IMAGE} alt="" />
        </Reveal>
      </section>

      <Reveal as="section" className="designers-form" variant="blur-up" id="designers-form">
        <h2 className="designers-form__title section-heading">ФОРМА ЗАЯВКИ</h2>
        <p className="designers-form__lead">
          Присоединяйтесь к программе и получите доступ
          <br />
          ко всем преимуществам.
        </p>
        <button type="button" className="designers-form__open-btn" onClick={openForm}>
          Заполнить форму
        </button>
      </Reveal>

      <section className="designers-outro">
        <Reveal className="designers-outro__content reveal-stagger" variant="up">
          <h2 className="designers-outro__title section-heading section-heading--left" style={{ '--stagger': 0 }}>
            Создаем интерьеры сильнее — вместе
          </h2>
          <p className="designers-outro__text" style={{ '--stagger': 1 }}>Вы создаете интерьер с характером.</p>
          <p className="designers-outro__text" style={{ '--stagger': 2 }}>Мы — делаем процесс проще, быстрее и надежнее.</p>
        </Reveal>
        <Reveal
          className="designers-outro__media"
          variant="up"
          delay={120}
          style={{ '--image-aspect': DESIGNER_OUTRO_ASPECT }}
        >
          <img src={DESIGNER_OUTRO_IMAGE} alt="" />
        </Reveal>
      </section>

      <DesignersInquiryModal isOpen={isFormOpen} onClose={closeForm} />
    </div>
  )
}

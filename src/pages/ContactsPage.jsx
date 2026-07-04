import { useState } from 'react'
import Reveal from '../components/Reveal'
import { SHOWROOMS, SHOWROOM_ORDER } from '../data/contacts'
import { SITE_IMAGES } from '../data/siteImages'
import { api } from '../admin/api'
import { useContacts } from '../hooks/useContacts'

function ShowroomMap({ map }) {
  const src = `https://yandex.ru/map-widget/v1/?ll=${map.lng}%2C${map.lat}&z=16&pt=${map.lng}%2C${map.lat}%2Cpm2rdm`

  return (
    <div className="contacts-page__map">
      <iframe
        title={map.title}
        src={src}
        width="100%"
        height="100%"
        loading="lazy"
        allowFullScreen
      />
    </div>
  )
}

export default function ContactsPage() {
  const { contacts, loading } = useContacts()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Пожалуйста, заполните имя')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError('Пожалуйста, введите e-mail адрес')
    }
    if (!form.message.trim()) return setError('Пожалуйста, введите ваш запрос')

    setSubmitting(true)
    try {
      await api.submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      })
      setSent(true)
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="contacts-page">
      <div className="contacts-page__hero">
        <img src={SITE_IMAGES.contactsHero} alt="" />
      </div>

      <Reveal className="contacts-page__intro reveal-stagger" variant="blur-up">
        <h1 className="contacts-page__title" style={{ '--stagger': 0 }}>ШОУРУМЫ</h1>
        <p className="contacts-page__lead" style={{ '--stagger': 1 }}>
          Мы на связи, чтобы помочь с выбором, консультацией или визитом в шоурум
        </p>
      </Reveal>

      <section className="contacts-page__overview">
        <Reveal className="contacts-page__summary" variant="up">
          <div className="contacts__info">
            <div className="contacts__row">
              <span className="contacts__label">Позвонить:</span>
              <a href={`tel:${contacts.astanaPhone?.replace(/[^+\d]/g, '')}`}>{contacts.astanaPhone}</a>
            </div>
            <div className="contacts__row">
              <span className="contacts__label">Написать:</span>
              <div className="contacts__write">
                <p>
                  WhatsApp:{' '}
                  <a href={`https://wa.me/${contacts.astanaPhone?.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                    {contacts.astanaPhone}
                  </a>
                </p>
                {contacts.emailGeneral && (
                  <p>
                    Общая почта:{' '}
                    <a href={`mailto:${contacts.emailGeneral}`}>{contacts.emailGeneral}</a>
                  </p>
                )}
                {contacts.emailCoop && (
                  <p>
                    Сотрудничество и предложения:{' '}
                    <a href={`mailto:${contacts.emailCoop}`}>{contacts.emailCoop}</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <div className="contacts-page__showrooms">
        {SHOWROOM_ORDER.map((key, index) => {
          const showroom = SHOWROOMS[key]
          return (
            <Reveal
              key={key}
              as="section"
              id={`showroom-${key}`}
              className={`contacts-page__showroom-row${key === 'astana' ? ' contacts-page__showroom-row--reverse' : ''}`}
              variant="up"
              delay={index * 60}
            >
              <div className="showroom-card contacts-page__showroom-card">
                <h2 className="showroom-card__city">{showroom.city}</h2>
                <p className="showroom-card__address">{key === 'astana' ? (contacts.astanaAddress || showroom.address) : key === 'almaty' ? (contacts.almatyAddress || showroom.address) : showroom.address}</p>
                <p className="showroom-card__desc">{showroom.description}</p>
                <p className="showroom-card__phone">
                  Позвонить:{' '}
                  {key === 'astana' && contacts.astanaPhone ? (
                    <a href={`tel:${contacts.astanaPhone.replace(/[^+\d]/g, '')}`}>{contacts.astanaPhone}</a>
                  ) : key === 'almaty' && contacts.almatyPhone ? (
                    <a href={`tel:${contacts.almatyPhone.replace(/[^+\d]/g, '')}`}>{contacts.almatyPhone}</a>
                  ) : (
                    <span>Номера не добавлены</span>
                  )}
                </p>
                <p className="showroom-card__wa">
                  WhatsApp:{' '}
                  <a href={`https://wa.me/${(key === 'astana' ? contacts.astanaPhone : (contacts.almatyPhone || contacts.astanaPhone))?.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                    Написать
                  </a>
                </p>
              </div>
              <ShowroomMap map={showroom.map} />
            </Reveal>
          )
        })}
      </div>

      <Reveal as="section" className="contacts-page__form" variant="blur-up">
        <h2 className="contacts-page__form-title section-heading">Отправьте ваш запрос</h2>
        <p className="contacts-page__form-lead">
          Мы предлагаем изысканную мебель и освещение от ведущих мировых производителей.
          В наших коллекциях вы найдёте уникальные предметы, которые подчеркнут
          индивидуальность вашего интерьера и создадут атмосферу уюта и гармонии.
        </p>

        {sent ? (
          <p className="contacts-page__form-success">Заявка отправлена. Мы свяжемся с вами в ближайшее время.</p>
        ) : (
          <form className="contacts-page__form-fields" onSubmit={handleSubmit}>
            {error && <p className="contacts-page__form-error">{error}</p>}

            <label className="contacts-page__field">
              <span>Введите имя*</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label className="contacts-page__field">
              <span>Введите email*</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>

            <label className="contacts-page__field contacts-page__field--full">
              <span>Ваш запрос</span>
              <textarea
                name="message"
                rows={5}
                placeholder="Введите ваш запрос"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </label>

            <p className="contacts-page__form-note">* – обязательно к заполнению</p>

            <button type="submit" className="contacts-page__form-submit" disabled={submitting}>
              {submitting ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </form>
        )}
      </Reveal>
    </div>
  )
}

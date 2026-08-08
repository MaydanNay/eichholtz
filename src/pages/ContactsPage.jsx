import { useState } from 'react'
import Reveal from '../components/Reveal'
import { SHOWROOMS, SHOWROOM_ORDER, toTelHref, toWhatsAppNumber } from '../data/contacts'
import { SITE_IMAGES } from '../data/siteImages'
import { api } from '../admin/api'
import { useContacts } from '../hooks/useContacts'
import { openInquiryWhatsApp } from '../utils/inquiryWhatsApp'

function ShowroomMap({ map }) {
  const src = `https://maps.google.com/maps?q=${map.lat},${map.lng}&hl=ru&z=16&output=embed`

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
  const { contacts } = useContacts()
  const waDisplay = contacts.whatsapp || contacts.astanaPhone
  const waDigits = toWhatsAppNumber(waDisplay)
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = form.name.trim()
    const phone = form.phone.trim()
    const message = form.message.trim()

    if (!name) return setError('Пожалуйста, заполните имя')
    if (phone.replace(/\D/g, '').length < 10) {
      return setError('Пожалуйста, введите корректный номер телефона')
    }

    setSubmitting(true)
    try {
      await api.submitInquiry({
        name,
        email: '',
        phone,
        message,
      })
      openInquiryWhatsApp({ name, phone, message })
      setSent(true)
      setForm({ name: '', phone: '', message: '' })
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
              <a href={`tel:${toTelHref(contacts.astanaPhone)}`}>{contacts.astanaPhone}</a>
            </div>
            <div className="contacts__row">
              <span className="contacts__label">Написать:</span>
              <div className="contacts__write">
                <p>
                  WhatsApp:{' '}
                  <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
                    {waDisplay}
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
                <p className="showroom-card__address">
                  <a 
                    href={`https://2gis.kz/${key}/search/${encodeURIComponent(key === 'astana' ? (contacts.astanaAddress || showroom.address) : key === 'almaty' ? (contacts.almatyAddress || showroom.address) : showroom.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {key === 'astana' ? (contacts.astanaAddress || showroom.address) : key === 'almaty' ? (contacts.almatyAddress || showroom.address) : showroom.address}
                  </a>
                </p>
                <p className="showroom-card__desc">{showroom.description}</p>
                <p className="showroom-card__phone">
                  Позвонить:{' '}
                  {key === 'astana' && contacts.astanaPhone ? (
                    <a href={`tel:${toTelHref(contacts.astanaPhone)}`}>{contacts.astanaPhone}</a>
                  ) : key === 'almaty' && contacts.almatyPhone ? (
                    <a href={`tel:${toTelHref(contacts.almatyPhone)}`}>{contacts.almatyPhone}</a>
                  ) : (
                    <span>Номера не добавлены</span>
                  )}
                </p>
                <p className="showroom-card__wa">
                  WhatsApp:{' '}
                  <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer">
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
          <p className="contacts-page__form-success">
            Заявка сохранена, и открыт чат WhatsApp — отправьте сообщение менеджеру, если окно не открылось само.
          </p>
        ) : (
          <form className="contacts-page__form-fields" onSubmit={handleSubmit}>
            {error && <p className="contacts-page__form-error">{error}</p>}

            <label className="contacts-page__field">
              <span>Введите имя *</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label className="contacts-page__field">
              <span>Введите телефон *</span>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </label>

            <label className="contacts-page__field contacts-page__field--full">
              <span>Комментарий</span>
              <textarea
                name="message"
                rows={5}
                placeholder="Введите комментарий"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
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

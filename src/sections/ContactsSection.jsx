import Reveal from '../components/Reveal'
import { SHOWROOMS, SHOWROOM_ORDER, toTelHref, toWhatsAppNumber } from '../data/contacts'
import { useContacts } from '../hooks/useContacts'

export default function ContactsSection() {
  const { contacts } = useContacts()
  const waDisplay = contacts.whatsapp || contacts.astanaPhone
  const waDigits = toWhatsAppNumber(waDisplay)

  return (
    <section className="contacts" id="contacts">
      <Reveal className="contacts__left reveal-stagger" variant="left">
        <h2 className="contacts__title section-heading section-heading--left" style={{ '--stagger': 0 }}>
          Шоурумы Eichholtz
        </h2>
        <p className="contacts__desc" style={{ '--stagger': 1 }}>
          Мы на связи, чтобы помочь с выбором, консультацией или визитом в шоурум
        </p>

        <div className="contacts__info" style={{ '--stagger': 2 }}>
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

      <Reveal className="contacts__cards reveal-stagger" variant="right" delay={120}>
        {SHOWROOM_ORDER.map((key, index) => {
          const showroom = SHOWROOMS[key]
          return (
            <div key={key} className="showroom-card" style={{ '--stagger': index }}>
              <h3 className="showroom-card__city">{showroom.city}</h3>
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
          )
        })}
      </Reveal>
    </section>
  )
}

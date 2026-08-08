import { useContacts } from '../hooks/useContacts'
import { toTelHref, toWhatsAppNumber } from '../data/contacts'

export default function ContractPage() {
  const { contacts } = useContacts()
  const phone = contacts.astanaPhone
  const wa = contacts.whatsapp || contacts.astanaPhone
  const waDigits = toWhatsAppNumber(wa)
  const telHref = toTelHref(phone)

  return (
    <div className="contract-page">
      <section className="contract-hero">
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/contract/hero-banner-eichholtz-contract-mobile-1.jpg" />
          <img src="/images/contract/branded-residences-eichholtz-contract-overzicht-3.jpg" alt="Eichholtz Contract Hero" className="contract-hero__bg" />
        </picture>
        <div className="contract-hero__content">
          <h1 className="contract-hero__logo-title">E I C H H O L T Z</h1>
          <h2 className="contract-hero__logo-subtitle">К О Н Т Р А К Т</h2>
          <p className="contract-hero__description-text">Ваш надежный партнер в сфере гостеприимства</p>
        </div>
      </section>

      <section className="contract-split">
        <div className="contract-split__image-wrap">
          <img src="/images/contract/eichholtz-contract-and-hospitality-1.jpg" alt="Interior solutions" className="contract-split__img" />
        </div>
        <div className="contract-split__content">
          <h2 className="contract-split__title">Интерьерные решения для сферы гостеприимства</h2>
          <p className="contract-split__text">
            Откройте для себя новое выражение роскошной жизни с Eichholtz. От первого видения до финальной реализации мы создаем уникальные жилые пространства, которые выглядят легкими, но исключительными. Многослойные по характеру, выверенные с точностью и созданные на века.
          </p>
          <a href="/contract/hospitality" className="link-underline" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Смотреть варианты</a>
        </div>
      </section>

      <section className="contract-split contract-split--reversed">
        <div className="contract-split__image-wrap">
          <img src="/images/contract/branded-residences-eichholtz-contract-1.jpg" alt="Branded Residences" className="contract-split__img" />
        </div>
        <div className="contract-split__content">
          <h2 className="contract-split__title">Брендированные резиденции</h2>
          <p className="contract-split__text">
            Eichholtz привносит всемирно признанный почерк в строительство жилой недвижимости, превращая объекты в брендовые направления с безошибочно узнаваемым стилем. Международная привлекательность, дизайнерский авторитет и безупречное исполнение сливаются воедино, создавая нечто более редкое, чем просто недвижимость — заявление о намерениях.
          </p>
          <a href="/contract/branded-residences" className="link-underline" style={{ marginTop: '1.5rem', display: 'inline-block' }}>Смотреть варианты</a>
        </div>
      </section>

      <section className="contract-split">
        <div className="contract-split__image-wrap">
          <img src="/images/contract/eichholtz-contract-overzicht-pagina.jpg" alt="Furniture Packages" className="contract-split__img" />
        </div>
        <div className="contract-split__content">
          <h2 className="contract-split__title">Комплексные мебельные решения</h2>
          <p className="contract-split__text">
            Eichholtz предлагает мебельные решения под ключ, объединяя высококлассную корпусную и мягкую мебель, освещение, аксессуары и решения для улицы. Каждый элемент тщательно подбирается с учетом особенностей вашего проекта.
          </p>
          <div className="contract-split__contacts" style={{ marginTop: '2rem', lineHeight: '1.6' }}>
            {phone && (
              <p style={{ marginBottom: '1rem' }}>
                <strong>Позвонить:</strong><br />
                <a href={`tel:${telHref}`} style={{ color: 'inherit', textDecoration: 'none' }}>{phone}</a>
              </p>
            )}
            {wa && waDigits && (
              <p style={{ marginBottom: '1rem' }}>
                <strong>Написать:</strong><br />
                WhatsApp:{' '}
                <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {wa}
                </a>
              </p>
            )}
            {contacts.emailGeneral && (
              <p style={{ marginBottom: '1rem' }}>
                <strong>Общая почта:</strong><br />
                <a href={`mailto:${contacts.emailGeneral}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {contacts.emailGeneral}
                </a>
              </p>
            )}
            {contacts.emailCoop && (
              <p>
                <strong>Сотрудничество и предложения:</strong><br />
                <a href={`mailto:${contacts.emailCoop}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {contacts.emailCoop}
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}

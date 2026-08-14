import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { useContacts } from '../hooks/useContacts'
import { getCategories } from '../api/categories'
import { categoryUrl } from '../utils/categoryUrl'
import { SHOWROOM_ORDER } from '../data/contacts'

const COLLECTION_LINKS = [
  { label: 'Новая коллекция', to: '/collections' },
  { label: 'Мебель', categoryName: 'Мебель' },
  { label: 'Освещение', categoryName: 'Освещение' },
  { label: 'Аксессуары', categoryName: 'Аксессуары' },
]

export default function Footer() {
  const { contacts } = useContacts()
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let cancelled = false
    getCategories(true)
      .then((cats) => {
        if (!cancelled) setCategories(cats || [])
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categoryByName = useMemo(() => {
    const map = new Map()
    categories.forEach((c) => {
      if (!map.has(c.name) || c.parent_id == null) map.set(c.name, c)
    })
    return map
  }, [categories])

  const showroomCount = SHOWROOM_ORDER.length

  return (
    <footer className="footer">
      <Reveal className="footer__inner" variant="up">
        <div className="footer__grid">
          <div className="footer__col">
            <h4 className="footer__col-title">О компании</h4>
            <Link to="/about">О бренде</Link>
            <Link to="/about">Наши преимущества (USP)</Link>
            {contacts.emailCoop ? (
              <a href={`mailto:${contacts.emailCoop}`}>Вакансии</a>
            ) : (
              <span>Вакансии</span>
            )}
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Клиентам</h4>
            <Link to="/contacts">Доставка и оплата</Link>
            <Link to="/contacts">Обмен и возврат</Link>
            <Link to="/contacts">Уход за мебелью</Link>
            <Link to="/designers">Сотрудничество с дизайнерами</Link>
            {contacts.privacyPolicyUrl ? (
              <a
                href={contacts.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__col-link"
              >
                Политика конфиденциальности
              </a>
            ) : (
              <span className="footer__col-link footer__muted">Политика конфиденциальности</span>
            )}
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Коллекции</h4>
            {COLLECTION_LINKS.map((item) => {
              if (item.categoryName) {
                const cat = categoryByName.get(item.categoryName)
                return cat ? (
                  <Link key={item.label} to={categoryUrl(cat)}>
                    {item.label}
                  </Link>
                ) : (
                  <Link
                    key={item.label}
                    to="/"
                    state={{ categoryName: item.categoryName, scrollTo: 'products', menuTs: Date.now() }}
                  >
                    {item.label}
                  </Link>
                )
              }
              return (
                <Link key={item.label} to={item.to}>
                  {item.label}
                </Link>
              )
            })}
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Контакты</h4>
            <Link to="/contacts">Связаться с нами</Link>
            <Link to="/contacts" className="footer__link-with-badge">
              Шоурумы в Казахстане
              <span className="footer__badge" aria-label={`${showroomCount} шоурума`}>
                {showroomCount}
              </span>
            </Link>
            <Link to="/contacts">Контакты</Link>
          </div>
        </div>

        <div className="footer__bottom">
          <img src="/logo.svg" alt="Eichholtz" className="footer__logo" />
          <div className="footer__bottom-meta">
            <p className="footer__copy">© {new Date().getFullYear()} Eichholtz Казахстан</p>
            {contacts.privacyPolicyUrl ? (
              <a
                href={contacts.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer__privacy-link"
              >
                Политика конфиденциальности
              </a>
            ) : null}
          </div>
          <div className="footer__socials">
            {contacts.socials?.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="nofollow noopener"
                className={`footer__social-link${social.iconUrl ? ' footer__social-link--icon' : ''}`}
                title={social.name}
              >
                {social.iconUrl ? (
                  <img
                    src={social.iconUrl}
                    alt={social.name}
                    className="footer__social-icon"
                  />
                ) : (
                  social.name
                )}
              </a>
            ))}
          </div>
        </div>
      </Reveal>
    </footer>
  )
}

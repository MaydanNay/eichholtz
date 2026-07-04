import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import { useContacts } from '../hooks/useContacts'
import { getCategories } from '../api/categories'
import { getCollections } from '../api/collections'
import { categoryUrl } from '../utils/categoryUrl'
import { collectionUrl } from '../utils/collectionUrl'

export default function Footer() {
  const { contacts } = useContacts()
  const [topCategories, setTopCategories] = useState([])
  const [newCollections, setNewCollections] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCategories(true),
      getCollections({ published: true, isNew: true })
    ]).then(([cats, colls]) => {
      if (cancelled) return
      setTopCategories(cats.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order))
      setNewCollections(colls || [])
    }).catch(console.error)
    return () => { cancelled = true }
  }, [])
  return (
    <footer className="footer">
      <Reveal className="footer__inner reveal-stagger" variant="up">
        <div className="footer__brand" style={{ '--stagger': 0 }}>
          <img src="/logo.webp" alt="Eichholtz.KZ" className="footer__logo" style={{ maxWidth: '140px', marginBottom: '1rem', display: 'block', filter: 'brightness(0) invert(1)' }} />
          <p className="footer__copy">© 2025 Eichholtz Казахстан</p>
        </div>

        <div className="footer__links" style={{ '--stagger': 1 }}>
          <div className="footer__col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>Разделы</h4>
            <Link to="/">Главная</Link>
            <Link to="/collections">Коллекции</Link>
            <Link to="/catalogues">Каталоги</Link>
            <Link to="/designers">Дизайнерам</Link>
            <Link to="/events">Мероприятия</Link>
            <Link to="/about">О компании</Link>
            <Link to="/contacts">Контакты</Link>
          </div>
          <div className="footer__col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>Новинки</h4>
            <Link to="/collections">Все новинки</Link>
            {newCollections.slice(0, 5).map(c => (
              <Link key={c.id} to={collectionUrl(c)}>{c.name}</Link>
            ))}
          </div>
          <div className="footer__col">
            <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem', fontWeight: '500' }}>Категории</h4>
            {topCategories.slice(0, 8).map(c => (
              <Link key={c.id} to={categoryUrl(c)}>{c.name}</Link>
            ))}
          </div>
        </div>

        <div className="footer__socials" style={{ '--stagger': 2 }}>
          {contacts.socials?.map(social => (
            <a 
              key={social.id} 
              href={social.url} 
              target="_blank" 
              rel="nofollow noopener" 
              className="footer__social-link"
              title={social.name}
            >
              {social.iconUrl ? (
                <img src={social.iconUrl} alt={social.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
              ) : (
                social.name
              )}
            </a>
          ))}
        </div>
      </Reveal>
    </footer>
  )
}

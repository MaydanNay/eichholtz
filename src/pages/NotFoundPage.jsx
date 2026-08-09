import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'

export default function NotFoundPage() {
  usePageMeta({
    enabled: true,
    title: 'Страница не найдена',
    description: 'Запрашиваемая страница не существует.',
    path: typeof window !== 'undefined' ? window.location.pathname : '/404',
    noindex: true,
  })

  return (
    <section className="empty-page not-found-page">
      <div className="not-found-page__inner">
        <p className="not-found-page__code">404</p>
        <h1 className="not-found-page__title">Страница не найдена</h1>
        <p className="empty-page__text">Такой страницы нет или она была удалена.</p>
        <Link to="/" className="link-underline not-found-page__link">
          На главную
        </Link>
      </div>
    </section>
  )
}

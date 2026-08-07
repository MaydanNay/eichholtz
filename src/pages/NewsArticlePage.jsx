import { useEffect, useState } from 'react'
import { api } from '../admin/api'
import Reveal from '../components/Reveal'
import { usePageMeta } from '../hooks/usePageMeta'

export default function NewsArticlePage({ newsId, onBack }) {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    api.getNewsItem(newsId)
      .then(setArticle)
      .catch(() => setError('Новость не найдена'))
      .finally(() => setLoading(false))
  }, [newsId])

  usePageMeta({
    enabled: !!article,
    title: article?.title,
    description: article?.content?.trim()
      ? article.content.trim().slice(0, 160)
      : article?.title,
    image: article?.image_url,
    path: article ? `/news/${article.id}` : undefined,
    type: 'article',
  })

  if (loading) {
    return <p className="news-article__status">Загрузка...</p>
  }

  if (error || !article) {
    return (
      <div className="news-article">
        <p className="news-article__status">{error || 'Новость не найдена'}</p>
        <button type="button" className="link-underline" onClick={onBack}>
          Все новости
        </button>
      </div>
    )
  }

  return (
    <article className="news-article">
      <Reveal variant="blur-up">
        <p className="news-article__tag">Журнал</p>
        <h1 className="news-article__title">{article.title}</h1>
        <time className="news-article__date">
          {new Date(article.created_at).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </Reveal>

      {article.image_url && (
        <Reveal variant="up" delay={100}>
          <div className="news-article__cover">
            <img src={article.image_url} alt="" />
          </div>
        </Reveal>
      )}

      {article.content && (
        <Reveal variant="up" delay={160}>
          <div className="news-article__content">
            <p>{article.content}</p>
          </div>
        </Reveal>
      )}

      <Reveal variant="fade" delay={200}>
        <button type="button" className="link-underline news-article__back" onClick={onBack}>
          ← Все новости
        </button>
      </Reveal>
    </article>
  )
}

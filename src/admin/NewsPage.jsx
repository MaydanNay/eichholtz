import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { matchesAdminSearch, useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import AdminTableThumb from './AdminTableThumb'
import ImageUploadField from './ImageUploadField'
import { buildPublishedRowMenuItems } from './adminMenuItems'
import { useAdminImageUpload } from './useAdminImageUpload'

const EMPTY = {
  title: '',
  content: '',
  image_url: '',
  published: true,
}

export default function NewsPage() {
  const { query } = useAdminSearch()
  const [news, setNews] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const imageUpload = useAdminImageUpload('news')

  const load = async () => {
    try {
      setNews(await api.getNews())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredNews = useMemo(
    () => news.filter((item) =>
      matchesAdminSearch(query, item.id, item.title, item.content),
    ),
    [news, query],
  )

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    imageUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (item) => {
    setForm({
      title: item.title,
      content: item.content,
      image_url: item.image_url,
      published: !!item.published,
    })
    setEditingId(item.id)
    imageUpload.initEdit(item.image_url)
    setShowForm(true)
    setError('')
  }

  const closeForm = async () => {
    await imageUpload.discardPending()
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingId) {
        await api.updateNews(editingId, form)
        await imageUpload.finalizeSave(form.image_url, editingId)
      } else {
        await api.createNews(form)
        imageUpload.initCreate()
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить новость?')) return

    const item = news.find((entry) => entry.id === id)

    try {
      await api.deleteNews(id)
      if (item?.image_url) {
        await imageUpload.deleteSavedOnEntityDelete(item.image_url)
      }
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePublished = async (item) => {
    try {
      await api.updateNews(item.id, { ...item, published: !item.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader title="Новости">
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить новость
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать новость' : 'Новая новость'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field admin-field--full">
              <span>Заголовок *</span>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </label>
            <ImageUploadField
              category="news"
              value={form.image_url}
              onChange={(nextUrl) => imageUpload.handleChange(
                form.image_url,
                nextUrl,
                (url) => setForm((current) => ({ ...current, image_url: url })),
              )}
              onRemove={(url) => imageUpload.handleRemove(
                url,
                () => setForm((current) => ({ ...current, image_url: '' })),
              )}
            />
            <label className="admin-field admin-field--full">
              <span>Содержание</span>
              <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              <span>Опубликовано</span>
            </label>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary">Сохранить</button>
            <button type="button" className="admin-btn" onClick={closeForm}>Отмена</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="admin-muted">Загрузка...</p>
      ) : filteredNews.length === 0 ? (
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Новостей пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Фото</th>
              <th>Заголовок</th>
              <th>Статус</th>
              <th>Дата</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredNews.map((n, index) => (
              <tr key={n.id}>
                <td className="admin-table__num">{index + 1}</td>
                <td><AdminTableThumb url={n.image_url} alt={n.title} /></td>
                <td>{n.title}</td>
                <td>
                  <span className={`admin-badge ${n.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {n.published ? 'Опубликовано' : 'Не опубликовано'}
                  </span>
                </td>
                <td>{new Date(n.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={buildPublishedRowMenuItems({
                      published: n.published,
                      onTogglePublish: () => togglePublished(n),
                      onEdit: () => openEdit(n),
                      onDelete: () => handleDelete(n.id),
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

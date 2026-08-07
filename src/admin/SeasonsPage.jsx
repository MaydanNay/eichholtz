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
  name: '',
  description: '',
  image_url: '',
  published: true,
}

export default function SeasonsPage() {
  const { query } = useAdminSearch()
  const [seasons, setSeasons] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const imageUpload = useAdminImageUpload('seasons')

  const load = async () => {
    try {
      setSeasons(await api.getSeasons())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredSeasons = useMemo(
    () => seasons.filter((season) =>
      matchesAdminSearch(query, season.id, season.name, season.description),
    ),
    [seasons, query],
  )

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    imageUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (season) => {
    setForm({
      name: season.name,
      description: season.description,
      image_url: season.image_url,
      published: !!season.published,
    })
    setEditingId(season.id)
    imageUpload.initEdit(season.image_url)
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
        await api.updateSeason(editingId, form)
        await imageUpload.finalizeSave(form.image_url, editingId)
      } else {
        await api.createSeason(form)
        imageUpload.initCreate()
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить сезон?')) return

    const season = seasons.find((item) => item.id === id)

    try {
      await api.deleteSeason(id)
      if (season?.image_url) {
        await imageUpload.deleteSavedOnEntityDelete(season.image_url)
      }
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePublished = async (season) => {
    try {
      await api.updateSeason(season.id, { ...season, published: !season.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Сезоны"
        hint="Периоды вроде «Весна / Лето 2026» — к ним привязываются коллекции"
      >
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить сезон
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать сезон' : 'Новый сезон'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field admin-field--full">
              <span>Название *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Весна / Лето 2026"
                required
              />
            </label>
            <ImageUploadField
              category="seasons"
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
              <span>Описание</span>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              <span>Опубликовано на сайте</span>
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
      ) : filteredSeasons.length === 0 ? (
        <p className="admin-muted">
          {query ? 'Ничего не найдено' : 'Сезонов пока нет — создайте первый, затем добавьте коллекции'}
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Фото</th>
              <th>Название</th>
              <th>Статус</th>
              <th>Дата</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredSeasons.map((s, index) => (
              <tr key={s.id}>
                <td className="admin-table__num">{index + 1}</td>
                <td><AdminTableThumb url={s.image_url} alt={s.name} /></td>
                <td>{s.name}</td>
                <td>
                  <span className={`admin-badge ${s.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {s.published ? 'Опубликован' : 'Не опубликован'}
                  </span>
                </td>
                <td>{new Date(s.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={buildPublishedRowMenuItems({
                      published: s.published,
                      onTogglePublish: () => togglePublished(s),
                      onEdit: () => openEdit(s),
                      onDelete: () => handleDelete(s.id),
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

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'
import { matchesAdminSearch, useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import AdminTableThumb from './AdminTableThumb'
import ImageUploadField from './ImageUploadField'
import { buildPublishedRowMenuItems } from './adminMenuItems'
import { useAdminImageUpload } from './useAdminImageUpload'

const EMPTY = {
  season_id: '',
  name: '',
  description: '',
  image_url: '',
  published: true,
  show_on_home: false,
  is_new: false,
  sort_order: 0,
}

export default function CollectionsPage() {
  const { query } = useAdminSearch()
  const navigate = useNavigate()
  const [collections, setCollections] = useState([])
  const [seasons, setSeasons] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const imageUpload = useAdminImageUpload('collections')

  const load = async () => {
    try {
      const [collectionsData, seasonsData] = await Promise.all([
        api.getCollections({ kind: 'category' }),
        api.getSeasons(),
      ])
      setCollections(collectionsData)
      setSeasons(seasonsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredCollections = useMemo(
    () => collections.filter((item) =>
      matchesAdminSearch(
        query,
        item.id,
        item.name,
        item.season_name,
        item.description,
      ),
    ),
    [collections, query],
  )

  const openCreate = () => {
    setForm({ ...EMPTY, season_id: seasons[0]?.id || '' })
    setEditingId(null)
    imageUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (item) => {
    setForm({
      season_id: item.season_id,
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      published: !!item.published,
      show_on_home: !!item.show_on_home,
      is_new: !!item.is_new,
      sort_order: item.sort_order ?? 0,
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
      const data = {
        ...form,
        kind: 'category',
        sort_order: parseInt(form.sort_order, 10) || 0,
      }
      if (editingId) {
        await api.updateCollection(editingId, data)
        await imageUpload.finalizeSave(form.image_url, editingId)
      } else {
        await api.createCollection(data)
        imageUpload.initCreate()
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить коллекцию?')) return

    const item = collections.find((entry) => entry.id === id)

    try {
      await api.deleteCollection(id)
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
      await api.updateCollection(item.id, { ...item, published: !item.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOpenDetails = (c) => {
    navigate(`/admin/collections/${c.id}`)
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Коллекции"
        hint="Линейки внутри сезона: Spring 2025, The MET и т.д. Не путать с категориями товаров (Столы, Диваны)."
      >
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={openCreate}
          disabled={seasons.length === 0}
        >
          + Добавить коллекцию
        </button>
      </AdminPageHeader>

      {seasons.length === 0 && !loading && (
        <p className="admin-error">Сначала создайте сезон в разделе «Сезоны»</p>
      )}

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать коллекцию' : 'Новая коллекция'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Сезон *</span>
              <select
                value={form.season_id}
                onChange={(e) => setForm({ ...form, season_id: e.target.value })}
                required
              >
                <option value="">Выберите сезон</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Порядок</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </label>
            <label className="admin-field admin-field--full">
              <span>Название *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Spring 2025"
                required
              />
            </label>
            <ImageUploadField
              category="collections"
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
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} />
              <span>Новинка</span>
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
      ) : filteredCollections.length === 0 ? (
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Коллекций пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Фото</th>
              <th>Название</th>
              <th>Сезон</th>
              <th>Порядок</th>
              <th>Новинка</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCollections.map((c, index) => (
              <tr 
                key={c.id}
                className="admin-table-row--hoverable"
                style={{ backgroundColor: 'var(--color-core-white)', cursor: 'pointer' }}
                onClick={() => handleOpenDetails(c)}
              >
                <td className="admin-table__num">{index + 1}</td>
                <td><AdminTableThumb url={c.image_url} alt={c.name} /></td>
                <td>{c.name}</td>
                <td>{c.season_name || '—'}</td>
                <td>{c.sort_order}</td>
                <td>{c.is_new ? 'Да' : '—'}</td>
                <td>
                  <span className={`admin-badge ${c.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {c.published ? 'Опубликована' : 'Не опубликована'}
                  </span>
                </td>
                <td className="admin-table__actions" onClick={e => e.stopPropagation()}>
                  <AdminRowMenu
                    items={[
                      { label: 'Настроить', onClick: () => handleOpenDetails(c) },
                      ...buildPublishedRowMenuItems({
                        published: c.published,
                        onTogglePublish: () => togglePublished(c),
                        onEdit: () => openEdit(c),
                        onDelete: () => handleDelete(c.id),
                      })
                    ]}
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

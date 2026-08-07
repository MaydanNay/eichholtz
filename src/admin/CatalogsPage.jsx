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
  parent_collection_id: '',
  name: '',
  description: '',
  image_url: '',
  pdf_url: '',
  published: true,
  sort_order: 0,
}

export default function CatalogsPage() {
  const { query } = useAdminSearch()
  const [catalogs, setCatalogs] = useState([])
  const [collections, setCollections] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const imageUpload = useAdminImageUpload('collections')

  const load = async () => {
    try {
      const [catalogsData, collectionsData] = await Promise.all([
        api.getCollections({ kind: 'catalog' }),
        api.getCollections({ kind: 'category' }),
      ])
      setCatalogs(catalogsData)
      setCollections(collectionsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredCatalogs = useMemo(
    () => catalogs.filter((item) =>
      matchesAdminSearch(
        query,
        item.id,
        item.name,
        item.parent_collection_name,
        item.description,
      ),
    ),
    [catalogs, query],
  )

  const openCreate = () => {
    setForm({ ...EMPTY, parent_collection_id: collections[0]?.id || '' })
    setEditingId(null)
    imageUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (item) => {
    setForm({
      parent_collection_id: item.parent_collection_id || '',
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      pdf_url: item.pdf_url || '',
      published: !!item.published,
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
        kind: 'catalog',
        parent_collection_id: form.parent_collection_id ? Number(form.parent_collection_id) : null,
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
    if (!confirm('Удалить каталог?')) return

    const item = catalogs.find((entry) => entry.id === id)

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
      await api.updateCollection(item.id, {
        parent_collection_id: item.parent_collection_id,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        pdf_url: item.pdf_url,
        published: !item.published,
        sort_order: item.sort_order,
        kind: 'catalog',
      })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title={`Каталоги (${catalogs.length.toLocaleString('ru-RU')} каталогов)`}
        hint="PDF-каталоги и буклеты — отображаются в блоке «Откройте наши каталоги» на главной"
      >
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          onClick={openCreate}
          disabled={collections.length === 0}
        >
          + Добавить каталог
        </button>
      </AdminPageHeader>

      {collections.length === 0 && !loading && (
        <p className="admin-error">Сначала создайте коллекцию в разделе «Коллекции»</p>
      )}

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать каталог' : 'Новый каталог'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Коллекция *</span>
              <select
                value={form.parent_collection_id}
                onChange={(e) => setForm({ ...form, parent_collection_id: e.target.value })}
                required
              >
                <option value="">Выберите коллекцию</option>
                {collections.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
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
            <label className="admin-field admin-field--full">
              <span>Ссылка на PDF</span>
              <input
                type="url"
                value={form.pdf_url}
                onChange={(e) => setForm({ ...form, pdf_url: e.target.value })}
                placeholder="https://files.eichholtz.kz/catalog.pdf"
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
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary">Сохранить</button>
            <button type="button" className="admin-btn" onClick={closeForm}>Отмена</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="admin-muted">Загрузка...</p>
      ) : filteredCatalogs.length === 0 ? (
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Каталогов пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Фото</th>
              <th>Название</th>
              <th>PDF</th>
              <th>Коллекция</th>
              <th>Порядок</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCatalogs.map((item, index) => (
              <tr key={item.id}>
                <td className="admin-table__num">{index + 1}</td>
                <td><AdminTableThumb url={item.image_url} alt={item.name} /></td>
                <td>{item.name}</td>
                <td>{item.pdf_url ? 'Есть' : '—'}</td>
                <td>{item.parent_collection_name || '—'}</td>
                <td>{item.sort_order}</td>
                <td>
                  <span className={`admin-badge ${item.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {item.published ? 'Опубликован' : 'Не опубликован'}
                  </span>
                </td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={[
                      ...(item.pdf_url ? [{ label: 'Посмотреть PDF', onClick: () => window.open(item.pdf_url, '_blank') }] : []),
                      ...buildPublishedRowMenuItems({
                        published: item.published,
                        onTogglePublish: () => togglePublished(item),
                        onEdit: () => openEdit(item),
                        onDelete: () => handleDelete(item.id),
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

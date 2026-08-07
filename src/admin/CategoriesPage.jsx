import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { matchesAdminSearch, useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import AdminTableThumb from './AdminTableThumb'
import { buildPublishedRowMenuItems } from './adminMenuItems'

const EMPTY = {
  name: '',
  description: '',
  published: true,
  sort_order: 1,
  parent_id: '',
}

export default function CategoriesPage() {
  const { query } = useAdminSearch()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState(new Set())

  const load = async () => {
    try {
      setCategories(await api.getCategories())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const rootCategories = useMemo(() => {
    const map = new Map()
    const roots = []
    
    categories.forEach(c => map.set(c.id, { ...c, children: [] }))

    map.forEach(c => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id).children.push(c)
      } else {
        roots.push(c)
      }
    })

    return roots
  }, [categories])

  const filteredCategories = useMemo(() => {
    if (query) {
      return categories
        .filter((item) => matchesAdminSearch(query, item.id, item.name, item.description))
        .map(c => ({ ...c, depth: 0 }))
    }

    const flatten = (nodes, depth = 0, isParentExpanded = true) => {
      const result = []
      nodes.forEach((node, i) => {
        if (!isParentExpanded) return
        result.push({ ...node, depth, displayIndex: i + 1 })
        const expanded = expandedIds.has(node.id)
        if (node.children && node.children.length > 0) {
          result.push(...flatten(node.children, depth + 1, expanded))
        }
        if (expanded && depth < 2) {
          result.push({ isAddSubcategoryBtn: true, parentId: node.id, depth: depth + 1, id: `add-${node.id}` })
        }
      })
      return result
    }

    return flatten(rootCategories)
  }, [categories, rootCategories, query, expandedIds])

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  const openEdit = (item) => {
    setForm({
      name: item.name,
      description: item.description,
      published: !!item.published,
      sort_order: item.sort_order ?? 0,
      parent_id: item.parent_id ?? '',
    })
    setEditingId(item.id)
    setShowForm(true)
    setError('')
  }

  const closeForm = async () => {
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const data = {
        ...form,
        sort_order: parseInt(form.sort_order, 10) || 0,
        parent_id: form.parent_id ? parseInt(form.parent_id, 10) : null,
      }
      if (editingId) {
        await api.updateCategory(editingId, data)
      } else {
        await api.createCategory(data)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить категорию?')) return

    const item = categories.find((entry) => entry.id === id)

    try {
      await api.deleteCategory(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePublished = async (item) => {
    try {
      await api.updateCategory(item.id, { ...item, published: !item.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title={`Категории (${categories.length.toLocaleString('ru-RU')} категорий)`}
        hint="Разделы каталога: Столы, Диваны, Освещение. К каждой категории привязываются товары."
      >
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить категорию
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать категорию' : 'Новая категория'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Порядок</span>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span>Родительская категория</span>
              <select
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              >
                <option value="">(Корневая)</option>
                {categories.filter(c => c.id !== editingId && !c.parent_id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="admin-field admin-field--full">
              <span>Название *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Столы"
                required
              />
            </label>
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
      ) : filteredCategories.length === 0 ? (
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Категорий пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Название</th>
              <th>Порядок</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.map((item, index) => {
              if (item.isAddSubcategoryBtn) {
                return (
                  <tr key={item.id}>
                    <td></td>
                    <td style={{ paddingLeft: `${item.depth * 1.5}rem` }} colSpan={4}>
                      <button 
                        type="button" 
                        className="link-underline" 
                        style={{ fontSize: '0.85rem', color: 'var(--color-primary)', display: 'inline-block', margin: '0.5rem 0' }}
                        onClick={() => {
                          setForm({ ...EMPTY, parent_id: item.parentId })
                          setEditingId(null)
                          setShowForm(true)
                          setError('')
                        }}
                      >
                        + Добавить подкатегорию
                      </button>
                    </td>
                  </tr>
                )
              }

              return (
              <tr key={item.id}>
                <td className="admin-table__num">{item.displayIndex}</td>
                <td style={{ paddingLeft: item.depth > 0 ? `${item.depth * 1.5}rem` : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.children && item.children.length > 0 ? (
                      <button 
                        type="button" 
                        onClick={() => toggleExpand(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem', color: 'var(--color-core-dark-grey)' }}
                        aria-label="Раскрыть"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: expandedIds.has(item.id) ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                    ) : (
                      <span style={{ width: '24px', display: 'inline-block' }}></span>
                    )}
                    {item.name}
                    {item.children && item.children.length > 0 && (
                      <span style={{ color: 'var(--color-core-dark-grey)', fontSize: '0.85rem' }}>({item.children.length})</span>
                    )}
                  </div>
                </td>
                <td>{item.sort_order}</td>
                <td>
                  <span className={`admin-badge ${item.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {item.published ? 'Опубликована' : 'Не опубликована'}
                  </span>
                </td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={buildPublishedRowMenuItems({
                      published: item.published,
                      onTogglePublish: () => togglePublished(item),
                      onEdit: () => openEdit(item),
                      onDelete: () => handleDelete(item.id),
                    })}
                  />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

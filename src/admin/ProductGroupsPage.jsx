import { useState, useEffect } from 'react'
import { api } from './api'

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingName, setEditingName] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.getProductGroups()
      setGroups(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRename = async () => {
    if (!editValue.trim() || editValue.trim() === editingName) {
      setEditingName(null)
      return
    }
    setSaving(true)
    try {
      await api.renameProductGroup(editingName, editValue.trim())
      setEditingName(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`Удалить группу «${name}»? Поле будет очищено у всех товаров этой группы.`)) return
    setSaving(true)
    try {
      await api.deleteProductGroup(name)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>

  return (
    <div style={{ padding: '0 2rem 2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Группы товаров ({groups.length})</h2>
        <p style={{ color: 'var(--color-core-dark-grey)', marginTop: '0.4rem', marginBottom: 0, fontSize: '0.9rem' }}>
          Группы формируются автоматически из поля «Группа товаров» у товаров. Здесь можно переименовать группу (обновит все товары) или удалить (очистит поле у всех товаров).
        </p>
      </div>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {groups.length === 0 ? (
        <p style={{ color: 'var(--color-core-dark-grey)' }}>Групп товаров пока нет</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {groups.map(g => (
            <div key={g.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', border: '1px solid var(--color-ui-bg-light)', borderRadius: '4px', background: 'var(--color-core-white)' }}>
              {editingName === g.name ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(null) }}
                  autoFocus
                  style={{ flex: 1, padding: '0.4rem 0.5rem', border: '1px solid var(--color-core-black)', borderRadius: '4px', fontSize: '1rem', marginRight: '1rem' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontWeight: 500 }}>{g.name}</span>
                  <span style={{ color: 'var(--color-core-dark-grey)', fontSize: '0.85rem' }}>{g.count} товаров</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {editingName === g.name ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRename}
                      disabled={saving}
                      style={{ padding: '0.4rem 0.8rem', background: 'var(--color-core-black)', color: 'var(--color-core-white)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(null)}
                      style={{ padding: '0.4rem 0.8rem', background: 'var(--color-ui-bg-light)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditingName(g.name); setEditValue(g.name) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
                      title="Переименовать"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.name)}
                      disabled={saving}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center', color: 'var(--color-core-black)' }}
                      title="Удалить группу"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

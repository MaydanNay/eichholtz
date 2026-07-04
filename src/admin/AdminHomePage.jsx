import React, { useEffect, useState, useRef } from 'react'
import { api } from './api'
import AdminPageHeader from './AdminPageHeader'
import CustomSelect from '../components/CustomSelect'
import { Link } from 'react-router-dom'
import HeroSection from '../sections/HeroSection'
import CollectionSection from '../sections/CollectionSection'

export default function AdminHomePage() {
  const [collections, setCollections] = useState([])
  const [heroItems, setHeroItems] = useState([])
  const [expandedSeasons, setExpandedSeasons] = useState([])
  const [seasons, setSeasons] = useState([])
  const [settings, setSettings] = useState({ block2_title: 'Новые коллекции' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [editingBlock1, setEditingBlock1] = useState(false)
  const [editingBlock2, setEditingBlock2] = useState(false)

  const load = async () => {
    try {
      const [colls, seas, sets] = await Promise.all([
        api.getCollections({ kind: 'category' }), // fetch all category collections (not catalogs)
        api.getSeasons(), // fetch all seasons
        api.getHomeSettings()
      ])
      setCollections(colls)
      
      const sortedHero = colls
        .filter(c => c.hero_order !== null && c.hero_order !== undefined)
        .sort((a, b) => a.hero_order - b.hero_order)
        .map(c => c.id)
      setHeroItems(sortedHero)

      setSeasons(seas)
      setSettings(prev => ({ ...prev, ...sets }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCollectionChange = (id, field, value) => {
    setCollections(collections.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ))
  }

  const handleHeroItemChange = (index, newId) => {
    const newItems = [...heroItems]
    newItems[index] = newId
    setHeroItems(newItems)
  }

  const removeHeroItem = (index) => {
    setHeroItems(heroItems.filter((_, i) => i !== index))
  }

  const addHeroItem = () => {
    setHeroItems([...heroItems, ''])
  }

  const handleSeasonChange = (id, field, value) => {
    setSeasons(seasons.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const toggleSeason = (seasonId) => {
    setExpandedSeasons(prev => 
      prev.includes(seasonId) ? prev.filter(id => id !== seasonId) : [...prev, seasonId]
    )
  }

  const dragItem = useRef(null)
  const dragOverItem = useRef(null)

  const handleDragStart = (e, type, index, id) => {
    dragItem.current = { type, index, id }
    e.dataTransfer.effectAllowed = 'move'
    // Hack to make it look nicer
    setTimeout(() => {
      e.target.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnter = (e, type, index) => {
    if (dragItem.current && dragItem.current.type === type) {
      dragOverItem.current = { type, index }
    }
  }

  const handleDragEnd = (e, type) => {
    e.target.style.opacity = '1'
    if (dragItem.current && dragOverItem.current && dragItem.current.type === dragOverItem.current.type) {
      if (dragItem.current.index !== dragOverItem.current.index) {
        if (type === 'season') {
          const newSeasons = [...seasons]
          const dragged = newSeasons.splice(dragItem.current.index, 1)[0]
          newSeasons.splice(dragOverItem.current.index, 0, dragged)
          newSeasons.forEach((s, i) => s.sort_order = i)
          setSeasons(newSeasons)
        } else if (type === 'collection') {
          const newCollections = [...collections]
          const dragged = newCollections.splice(dragItem.current.index, 1)[0]
          newCollections.splice(dragOverItem.current.index, 0, dragged)
          newCollections.forEach((c, i) => c.sort_order = i)
          setCollections(newCollections)
        }
      }
    }
    dragItem.current = null
    dragOverItem.current = null
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const collectionsToSave = collections.map((c, idx) => {
        const heroIndex = heroItems.findIndex(id => id !== '' && String(id) === String(c.id))
        return {
          id: c.id,
          hero_order: heroIndex !== -1 ? heroIndex + 1 : null,
          sort_order: c.sort_order !== undefined ? c.sort_order : idx,
          show_on_home: !!c.show_on_home
        }
      })

      await Promise.all([
        api.saveHomeCollections(collectionsToSave),
        api.saveHomeSeasons(seasons.map((s, idx) => ({
          id: s.id,
          sort_order: s.sort_order !== undefined ? s.sort_order : idx,
          show_on_home: !!s.show_on_home
        }))),
        api.saveHomeSettings({ block2_title: settings.block2_title })
      ])
      alert('Настройки сохранены')
      load()
      await load() // reload to fetch new previews
      setEditingBlock1(false)
      setEditingBlock2(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="admin-page"><p className="admin-muted">Загрузка...</p></div>

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Главная страница"
        hint="Управление блоками на главной странице сайта"
      />

      {error && <p className="admin-error">{error}</p>}
      
      {!editingBlock1 ? (
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Блок 1: Автоскролл (Герой)</h2>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setEditingBlock1(true)}>
              Редактировать
            </button>
          </div>
          <div style={{ border: '1px solid #eaeaea', borderRadius: '8px', overflow: 'hidden' }}>
            <HeroSection isPreview={true} />
          </div>
        </div>
      ) : (
        <div className="admin-card">
          <h2>Блок 1: Автоскролл (Герой)</h2>
          <p className="admin-muted">
            Добавьте коллекции, которые должны отображаться в главном слайдере, и выберите их в нужном порядке.
          </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Порядок</th>
              <th>Название коллекции</th>
              <th style={{ width: '100px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {heroItems.map((colId, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>
                  <div style={{ maxWidth: '400px' }}>
                    <CustomSelect
                      value={colId || ''}
                      onChange={val => handleHeroItemChange(index, val)}
                      placeholder="Выберите коллекцию..."
                      options={collections
                        .filter(c => String(c.id) === String(colId) || !heroItems.some(id => String(id) === String(c.id)))
                        .map(c => ({ value: c.id, label: c.name }))}
                    />
                  </div>
                </td>
                <td>
                  <button 
                    type="button" 
                    className="admin-btn" 
                    style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#e74c3c' }}
                    onClick={() => removeHeroItem(index)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan="3">
                <button type="button" className="admin-btn admin-btn--primary" onClick={addHeroItem}>
                  + Добавить коллекцию
                </button>
              </td>
            </tr>
          </tbody>
        </table>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button type="button" className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" className="admin-btn" onClick={() => {
                setEditingBlock1(false)
                load()
              }} disabled={saving}>
                Отмена
              </button>
            </div>
          </div>
      )}

      {!editingBlock2 ? (
        <div className="admin-card" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Блок 2: Коллекции / Сезоны</h2>
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => setEditingBlock2(true)}>
              Редактировать
            </button>
          </div>
          <div style={{ border: '1px solid #eaeaea', borderRadius: '8px', overflow: 'hidden' }}>
            <CollectionSection isPreview={true} />
          </div>
        </div>
      ) : (
        <div className="admin-card" style={{ marginTop: '2rem' }}>
          <h2>Блок 2: Настройки блока</h2>
        <div className="admin-field admin-field--full" style={{ marginBottom: '1rem' }}>
          <span>Заголовок над переключателем сезонов</span>
          <input 
            type="text" 
            value={settings.block2_title || ''}
            onChange={e => setSettings(s => ({ ...s, block2_title: e.target.value }))}
            placeholder="Например: Новые коллекции"
          />
        </div>

        <h2>Сезоны и коллекции на главной</h2>
        <p className="admin-muted" style={{ marginBottom: '1rem' }}>
          Выберите сезоны, а внутри них — коллекции, которые будут отображаться во втором блоке.
          Нажмите на строку сезона, чтобы раскрыть список его коллекций. 
          Потяните за иконку слева (☰), чтобы изменить порядок.
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Порядок</th>
              <th style={{ width: '40px' }}></th>
              <th style={{ width: '30px' }}></th>
              <th>Название</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Показ</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((s, sIndex) => {
              const isExpanded = expandedSeasons.includes(s.id)
              const seasonCollections = collections.filter(c => c.season_id === s.id)
              
              return (
                <React.Fragment key={s.id}>
                  <tr 
                    style={{ backgroundColor: '#f9f9f9', cursor: 'pointer' }} 
                    onClick={() => toggleSeason(s.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'season', sIndex, s.id)}
                    onDragEnter={(e) => handleDragEnter(e, 'season', sIndex)}
                    onDragEnd={(e) => handleDragEnd(e, 'season')}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td style={{ textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>{sIndex + 1}</td>
                    <td onClick={e => e.stopPropagation()} style={{ cursor: 'grab', color: '#ccc', textAlign: 'center' }}>
                      ☰
                    </td>
                    <td style={{ color: '#888', fontSize: '0.8rem', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        transform: isExpanded ? 'rotate(90deg)' : 'none', 
                        transition: 'transform 0.2s' 
                      }}>
                        ▶
                      </span>
                    </td>
                    <td>{s.name}</td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={s.show_on_home || false}
                        onChange={e => handleSeasonChange(s.id, 'show_on_home', e.target.checked)}
                      />
                    </td>
                  </tr>
                  
                  {isExpanded && seasonCollections.map((c, cLocalIndex) => {
                    const cIndex = collections.findIndex(col => col.id === c.id)
                    return (
                      <tr 
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'collection', cIndex, c.id)}
                        onDragEnter={(e) => handleDragEnter(e, 'collection', cIndex)}
                        onDragEnd={(e) => handleDragEnd(e, 'collection')}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <td style={{ textAlign: 'center', color: '#888', fontSize: '0.85rem', paddingLeft: '1.5rem' }}>{cLocalIndex + 1}</td>
                        <td style={{ cursor: 'grab', color: '#ccc', textAlign: 'center' }}>
                          ☰
                        </td>
                        <td></td>
                        <td>
                          <Link 
                            to={`/admin/collections/${c.id}`} 
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {c.name}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={c.show_on_home || false}
                            onChange={e => handleCollectionChange(c.id, 'show_on_home', e.target.checked)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  
                  {isExpanded && seasonCollections.length === 0 && (
                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td colSpan="2" className="admin-muted" style={{ fontStyle: 'italic', paddingBottom: '0.5rem' }}>
                        Нет коллекций в этом сезоне
                      </td>
                    </tr>
                  )}
                  {isExpanded && (
                    <tr>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td colSpan="2" style={{ paddingTop: seasonCollections.length === 0 ? '0' : '0.5rem', paddingBottom: '1rem' }}>
                        <Link to="/admin/collections" style={{ fontSize: '0.85rem', color: '#666', textDecoration: 'underline' }}>
                          + Добавить коллекцию
                        </Link>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          <button type="button" className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link to="/admin/collections" className="admin-btn">
            + Добавить сезон
          </Link>
          <button type="button" className="admin-btn" onClick={() => {
            setEditingBlock2(false)
            load()
          }} disabled={saving}>
            Отмена
          </button>
        </div>
      </div>
      )}
    </div>
  )
}

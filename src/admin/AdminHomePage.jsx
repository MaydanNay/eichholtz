import React, { useEffect, useState, useRef } from 'react'
import { api } from './api'
import AdminPageHeader from './AdminPageHeader'
import CustomSelect from '../components/CustomSelect'
import ImageUploadField from './ImageUploadField'
import { Link } from 'react-router-dom'
import HeroSection from '../sections/HeroSection'
import CollectionSection from '../sections/CollectionSection'
import {
  createEmptyHeroSlide,
  parseHeroSlides,
  slidesFromHeroCollections,
} from '../utils/heroSlides'
import { collectionUrl } from '../utils/collectionUrl'

export default function AdminHomePage() {
  const [collections, setCollections] = useState([])
  const [heroSlides, setHeroSlides] = useState([])
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
        api.getCollections({ kind: 'category' }),
        api.getSeasons(),
        api.getHomeSettings()
      ])
      setCollections(colls)

      const parsed = parseHeroSlides(sets.hero_slides)
      const legacy = slidesFromHeroCollections(colls)
      // Empty/corrupt hero_slides → fall back to collections with hero_order
      setHeroSlides(parsed.length > 0 ? parsed : legacy)

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

  const updateHeroSlide = (index, patch) => {
    setHeroSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide))
    )
  }

  const fillHeroSlideFromCollection = (index, collectionId) => {
    if (collectionId === '' || collectionId == null) {
      updateHeroSlide(index, { collection_id: null })
      return
    }
    const collection = collections.find((c) => String(c.id) === String(collectionId))
    if (!collection) {
      updateHeroSlide(index, { collection_id: null })
      return
    }
    updateHeroSlide(index, {
      collection_id: collection.id,
      title: collection.name || '',
      subtitle: collection.season_name || '',
      image_url: collection.image_url || '',
      link: collectionUrl(collection),
    })
  }

  const removeHeroSlide = (index) => {
    setHeroSlides(heroSlides.filter((_, i) => i !== index))
  }

  const addHeroSlide = () => {
    setHeroSlides([...heroSlides, createEmptyHeroSlide()])
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
      const slidesToSave = heroSlides
        .map((slide, index) => ({
          id: slide.id || `slide-${index + 1}`,
          subtitle: (slide.subtitle || '').trim(),
          title: (slide.title || '').trim(),
          image_url: (slide.image_url || '').trim(),
          link: (slide.link || '').trim(),
          collection_id: slide.collection_id ? Number(slide.collection_id) || slide.collection_id : null,
        }))
        .filter((slide) => slide.title || slide.image_url || slide.link)

      if (editingBlock1 && slidesToSave.length === 0) {
        throw new Error('Добавьте хотя бы один слайд с заголовком, фото или ссылкой')
      }

      const collectionsToSave = collections.map((c, idx) => {
        let heroOrder = c.hero_order ?? null
        if (editingBlock1) {
          const heroIndex = slidesToSave.findIndex(
            (s) => s.collection_id != null && String(s.collection_id) === String(c.id),
          )
          heroOrder = heroIndex !== -1 ? heroIndex + 1 : null
        }
        return {
          id: c.id,
          hero_order: heroOrder,
          sort_order: c.sort_order !== undefined ? c.sort_order : idx,
          show_on_home: !!c.show_on_home,
        }
      })

      const settingsPayload = {
        block2_title: settings.block2_title || 'Новые коллекции',
      }
      // Only rewrite hero slides when editing block 1
      if (editingBlock1) {
        settingsPayload.hero_slides = JSON.stringify(slidesToSave)
      }

      await api.saveHomeSettings(settingsPayload)
      await api.saveHomeCollections(collectionsToSave)
      await api.saveHomeSeasons(seasons.map((s, idx) => ({
        id: s.id,
        sort_order: s.sort_order !== undefined ? s.sort_order : idx,
        show_on_home: !!s.show_on_home
      })))

      if (editingBlock1) {
        await Promise.allSettled(
          slidesToSave
            .filter((s) => s.collection_id && s.image_url)
            .map((s) => {
              const current = collections.find((c) => String(c.id) === String(s.collection_id))
              if (!current || current.image_url === s.image_url) return Promise.resolve()
              return api.updateCollection(s.collection_id, {
                season_id: current.season_id,
                parent_collection_id: current.parent_collection_id,
                name: current.name,
                description: current.description,
                image_url: s.image_url,
                pdf_url: current.pdf_url,
                published: current.published,
                sort_order: current.sort_order,
                kind: current.kind,
                show_on_home: current.show_on_home,
                is_new: current.is_new,
              })
            }),
        )
        setHeroSlides(slidesToSave)
      }

      alert('Настройки сохранены')
      await load()
      setEditingBlock1(false)
      setEditingBlock2(false)
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
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
          <div style={{ border: '1px solid var(--color-ui-bg-light)', borderRadius: '8px', overflow: 'hidden' }}>
            <HeroSection
              isPreview={true}
              slidesOverride={heroSlides}
              key={heroSlides.map((s) => s.image_url || s.id).join('|')}
            />
          </div>
        </div>
      ) : (
        <div className="admin-card">
          <h2>Блок 1: Автоскролл (Герой)</h2>
          <p className="admin-muted">
            Для каждого слайда задайте надзаголовок, заголовок, фото и ссылку кнопки «Смотреть коллекцию».
            Можно быстро заполнить поля из существующей коллекции и потом поправить вручную.
          </p>

          <div className="admin-hero-slides">
            {heroSlides.map((slide, index) => (
              <div key={slide.id || index} className="admin-hero-slide">
                <div className="admin-hero-slide__head">
                  <strong>Слайд {index + 1}</strong>
                  <button
                    type="button"
                    className="admin-btn"
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    onClick={() => removeHeroSlide(index)}
                  >
                    Удалить
                  </button>
                </div>

                <div className="admin-field admin-field--full">
                  <span>Заполнить из коллекции (необязательно)</span>
                  <div style={{ maxWidth: '420px' }}>
                    <CustomSelect
                      value={slide.collection_id != null ? String(slide.collection_id) : ''}
                      onChange={(val) => fillHeroSlideFromCollection(index, val)}
                      placeholder="Выберите коллекцию..."
                      options={[
                        { value: '', label: '— вручную —' },
                        ...collections.map((c) => ({ value: String(c.id), label: c.name })),
                      ]}
                    />
                  </div>
                </div>

                <div className="admin-field admin-field--full">
                  <span>Надзаголовок</span>
                  <input
                    type="text"
                    value={slide.subtitle || ''}
                    onChange={(e) => updateHeroSlide(index, { subtitle: e.target.value })}
                    placeholder="Например: Зима 2026"
                  />
                </div>

                <div className="admin-field admin-field--full">
                  <span>Заголовок</span>
                  <input
                    type="text"
                    value={slide.title || ''}
                    onChange={(e) => updateHeroSlide(index, { title: e.target.value })}
                    placeholder="Название на слайде"
                  />
                </div>

                <ImageUploadField
                  label="Фото"
                  category="hero"
                  value={slide.image_url || ''}
                  onChange={(url) => updateHeroSlide(index, { image_url: url })}
                />

                <div className="admin-field admin-field--full">
                  <span>Ссылка кнопки «Смотреть коллекцию»</span>
                  <input
                    type="text"
                    value={slide.link || ''}
                    onChange={(e) => updateHeroSlide(index, { link: e.target.value })}
                    placeholder="/collection/123-name или https://..."
                  />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="admin-btn admin-btn--primary" onClick={addHeroSlide}>
            + Добавить слайд
          </button>

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
          <div style={{ border: '1px solid var(--color-ui-bg-light)', borderRadius: '8px', overflow: 'hidden' }}>
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
                    style={{ backgroundColor: 'var(--color-ui-bg-light)', cursor: 'pointer' }} 
                    onClick={() => toggleSeason(s.id)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'season', sIndex, s.id)}
                    onDragEnter={(e) => handleDragEnter(e, 'season', sIndex)}
                    onDragEnd={(e) => handleDragEnd(e, 'season')}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <td style={{ textAlign: 'center', color: 'var(--color-core-dark-grey)', fontSize: '0.9rem' }}>{sIndex + 1}</td>
                    <td onClick={e => e.stopPropagation()} style={{ cursor: 'grab', color: 'var(--color-core-light-grey)', textAlign: 'center' }}>
                      ☰
                    </td>
                    <td style={{ color: 'var(--color-core-dark-grey)', fontSize: '0.8rem', textAlign: 'center' }}>
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
                        <td style={{ textAlign: 'center', color: 'var(--color-core-dark-grey)', fontSize: '0.85rem', paddingLeft: '1.5rem' }}>{cLocalIndex + 1}</td>
                        <td style={{ cursor: 'grab', color: 'var(--color-core-light-grey)', textAlign: 'center' }}>
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
                        <Link to="/admin/collections" style={{ fontSize: '0.85rem', color: 'var(--color-core-dark-grey)', textDecoration: 'underline' }}>
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

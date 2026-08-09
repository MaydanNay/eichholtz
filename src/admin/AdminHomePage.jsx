import React, { useEffect, useState } from 'react'
import { api } from './api'
import AdminPageHeader from './AdminPageHeader'
import CustomSelect from '../components/CustomSelect'
import ImageUploadField from './ImageUploadField'
import HeroSection from '../sections/HeroSection'
import {
  createEmptyHeroSlide,
  parseHeroSlides,
  slidesFromHeroCollections,
} from '../utils/heroSlides'
import { collectionUrl } from '../utils/collectionUrl'

export default function AdminHomePage() {
  const [collections, setCollections] = useState([])
  const [heroSlides, setHeroSlides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = async () => {
    try {
      const [colls, sets] = await Promise.all([
        api.getCollections({ kind: 'category' }),
        api.getHomeSettings(),
      ])
      setCollections(colls)

      const parsed = parseHeroSlides(sets.hero_slides)
      const legacy = slidesFromHeroCollections(colls)
      setHeroSlides(parsed.length > 0 ? parsed : legacy)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const updateHeroSlide = (index, patch) => {
    setHeroSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
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
          collection_id: slide.collection_id
            ? Number(slide.collection_id) || slide.collection_id
            : null,
        }))
        .filter((slide) => slide.title || slide.image_url || slide.link)

      if (slidesToSave.length === 0) {
        throw new Error('Добавьте хотя бы один слайд с заголовком, фото или ссылкой')
      }

      await api.saveHomeSettings({
        hero_slides: JSON.stringify(slidesToSave),
      })

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
      alert('Настройки сохранены')
      await load()
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <p className="admin-muted">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Главная страница"
        hint="Управление героем на главной. Категории во втором блоке сайта заданы в коде и здесь не редактируются."
      />

      {error && <p className="admin-error">{error}</p>}

      {!editing ? (
        <div className="admin-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <h2 style={{ margin: 0 }}>Герой (автоскролл)</h2>
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => setEditing(true)}
            >
              Редактировать
            </button>
          </div>
          <div
            style={{
              border: '1px solid var(--color-ui-bg-light)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <HeroSection
              isPreview={true}
              slidesOverride={heroSlides}
              key={heroSlides.map((s) => s.image_url || s.id).join('|')}
            />
          </div>
        </div>
      ) : (
        <div className="admin-card">
          <h2>Герой (автоскролл)</h2>
          <p className="admin-muted">
            Для каждого слайда задайте надзаголовок, заголовок, фото и ссылку кнопки
            «Смотреть коллекцию». Можно быстро заполнить поля из существующей коллекции
            и потом поправить вручную.
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
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                setEditing(false)
                load()
              }}
              disabled={saving}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { getHomeSettings, saveHomeSettings } from '../api/homeSettings'
import { api } from './api'

const DEFAULT_ATTRIBUTES = {
  color: { label: 'Цвет', options: [] },
  finish: { label: 'Отделка', options: [] },
  fabric: { label: 'Ткань', options: [] },
  material: { label: 'Материал', options: [] },
  shape: { label: 'Форма', options: [] },
}

export default function FilterOptionsPage() {
  const [attributes, setAttributes] = useState(DEFAULT_ATTRIBUTES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState('color')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingOldKey, setEditingOldKey] = useState('')
  
  const [newKey, setNewKey] = useState('')
  const [colorValues, setColorValues] = useState(['var(--color-core-black)'])

  useEffect(() => {
    getHomeSettings()
      .then(data => {
        if (data.product_attributes) {
          try {
            const parsed = JSON.parse(data.product_attributes)
            setAttributes({ ...DEFAULT_ATTRIBUTES, ...parsed })
          } catch (e) {
            setAttributes(DEFAULT_ATTRIBUTES)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (updatedAttributes) => {
    setSaving(true)
    try {
      await saveHomeSettings({ product_attributes: JSON.stringify(updatedAttributes) })
      setAttributes(updatedAttributes)
    } catch (err) {
      console.error(err)
      alert('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = () => {
    if (!newKey.trim()) return
    const updated = { ...attributes }
    const cat = updated[activeCategory] || { label: activeCategory, options: [] }
    
    const isNew = !editingOldKey
    
    // Check if exists when creating new, or if changing name to an existing one
    if ((isNew || editingOldKey.toLowerCase() !== newKey.trim().toLowerCase()) && 
        cat.options.find(o => o.value.toLowerCase() === newKey.trim().toLowerCase())) {
      alert('Такая опция уже существует!')
      return
    }

    const newOption = { value: newKey.trim() }
    if (colorValues.length > 0 && colorValues.some(v => v.trim() !== '')) {
      newOption.swatch = colorValues.join(', ')
    } else {
      delete newOption.swatch
    }

    if (isNew) {
      cat.options = [...cat.options, newOption]
    } else {
      const idx = cat.options.findIndex(o => o.value === editingOldKey)
      if (idx !== -1) {
        cat.options[idx] = newOption
      } else {
        cat.options = [...cat.options, newOption]
      }
    }
    
    updated[activeCategory] = cat
    
    handleSave(updated)
    setNewKey('')
    setColorValues(['var(--color-core-black)'])
    setEditingOldKey('')
    setShowAddModal(false)
  }

  const handleDelete = (optValue) => {
    const updated = { ...attributes }
    const cat = updated[activeCategory]
    if (cat) {
      cat.options = cat.options.filter(o => o.value !== optValue)
      updated[activeCategory] = cat
      handleSave(updated)
    }
  }

  const handleChangeColor = (optValue, newColor) => {
    const updated = { ...attributes }
    const cat = updated[activeCategory]
    if (cat) {
      const idx = cat.options.findIndex(o => o.value === optValue)
      if (idx !== -1) {
        cat.options[idx].swatch = newColor
        updated[activeCategory] = cat
        handleSave(updated)
      }
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>

  const currentCategory = attributes[activeCategory] || { label: '', options: [] }
  const hasColor = true // Enable for all categories

  return (
    <div style={{ padding: '0 2rem 2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Характеристики товаров</h2>
      <p style={{ color: 'var(--color-core-dark-grey)', marginBottom: '2rem' }}>
        Здесь вы можете задать возможные варианты для характеристик товаров (Материал, Цвет, Отделка и т.д.).
        Эти значения будут использоваться при создании товара и для фильтров в каталоге.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-ui-bg-light)', paddingBottom: '1rem' }}>
        {Object.entries(attributes).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => { setActiveCategory(key); setNewKey(''); setColorValues(['var(--color-core-black)']); }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: activeCategory === key ? 'var(--color-core-black)' : 'var(--color-ui-bg-light)',
              color: activeCategory === key ? 'var(--color-core-white)' : 'var(--color-core-black)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {cat.label || key} ({cat.options?.length || 0})
          </button>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.1rem' }}>Варианты: {currentCategory.label} ({currentCategory.options?.length || 0})</h3>
          <button 
            onClick={() => {
              setEditingOldKey('')
              setNewKey('')
              setColorValues(['var(--color-core-black)'])
              setShowAddModal(true)
            }}
            style={{ padding: '0.5rem 1rem', background: 'var(--color-core-black)', color: 'var(--color-core-white)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            + Добавить
          </button>
        </div>

        {showAddModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--color-core-white)', padding: '2rem', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{editingOldKey ? 'Изменить' : 'Добавить'}: {currentCategory.label}</h3>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Название</label>
                  <input 
                    type="text" 
                    value={newKey} 
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Например: Brass (antiqued)"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px' }}
                  />
                </div>
                
                {hasColor && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Цвета / Картинка</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {colorValues.map((val, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input 
                            type="color" 
                            value={val.startsWith('#') ? val.substring(0, 7) : 'var(--color-core-black)'} 
                            onChange={e => {
                              const newArr = [...colorValues]
                              newArr[idx] = e.target.value
                              setColorValues(newArr)
                            }}
                            style={{ width: '50px', height: '40px', padding: '0', cursor: 'pointer', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px' }}
                          />
                          <input 
                            type="text" 
                            value={val}
                            onChange={e => {
                              const newArr = [...colorValues]
                              newArr[idx] = e.target.value
                              setColorValues(newArr)
                            }}
                            placeholder="var(--color-core-black) или http://..."
                            style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px', minWidth: 0 }}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'var(--color-ui-bg-light)', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            <input 
                              type="file" 
                              accept="image/*" 
                              style={{ display: 'none' }} 
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                try {
                                  const { url } = await api.uploadImage(file, 'materials')
                                  const newArr = [...colorValues]
                                  newArr[idx] = url
                                  setColorValues(newArr)
                                } catch (err) {
                                  alert('Ошибка загрузки: ' + err.message)
                                }
                                e.target.value = ''
                              }}
                            />
                          </label>
                          <button 
                            type="button" 
                            onClick={() => {
                              const newArr = colorValues.filter((_, i) => i !== idx)
                              setColorValues(newArr)
                            }}
                            style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                            title="Удалить цвет"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => {
                        if (colorValues.length < 3) {
                          setColorValues([...colorValues, 'var(--color-core-white)'])
                        }
                      }}
                      disabled={colorValues.length >= 3}
                      style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', background: 'var(--color-ui-bg-light)', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px', cursor: colorValues.length >= 3 ? 'not-allowed' : 'pointer' }}
                    >
                      + Добавить цвет
                    </button>
                    
                    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-ui-bg-light)', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Итоговый цвет:</span>
                      <div 
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          background: colorValues.length === 0 ? 'transparent' : colorValues.length === 2 
                            ? `linear-gradient(135deg, ${colorValues[0].trim()} 50%, ${colorValues[1].trim()} 50%)`
                            : colorValues.length >= 3 
                            ? `linear-gradient(135deg, ${colorValues[0].trim()} 33%, ${colorValues[1].trim()} 33% 66%, ${colorValues[2].trim()} 66%)`
                            : (colorValues[0].startsWith('http') || colorValues[0].startsWith('/') ? `url(${colorValues[0]}) center/cover` : colorValues[0]),
                          border: '1px solid var(--color-core-light-grey)', 
                          borderRadius: '50%' 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: '0.6rem 1rem', background: 'var(--color-ui-bg-light)', color: 'var(--color-core-black)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    Отмена
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAdd}
                    disabled={saving || !newKey.trim()}
                    style={{ padding: '0.6rem 1rem', background: 'var(--color-core-black)', color: 'var(--color-core-white)', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    {saving ? 'Сохранение...' : (editingOldKey ? 'Сохранить' : 'Добавить')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
          {currentCategory.options.length === 0 ? (
            <p style={{ color: 'var(--color-core-dark-grey)' }}>Варианты пока не заданы</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...currentCategory.options].sort((a, b) => a.value.localeCompare(b.value)).map((opt) => (
                <div key={opt.value} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem', border: '1px solid var(--color-ui-bg-light)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {hasColor && (
                      <div 
                        style={{ 
                          width: '30px', 
                          height: '30px', 
                          background: opt.swatch ? (
                            opt.swatch.startsWith('http') || opt.swatch.startsWith('/') ? `url(${opt.swatch}) center/cover` : 
                            opt.swatch.includes(',') ? 
                              (opt.swatch.split(',').length === 2 ? 
                                `linear-gradient(135deg, ${opt.swatch.split(',')[0].trim()} 50%, ${opt.swatch.split(',')[1].trim()} 50%)` 
                              : `linear-gradient(135deg, ${opt.swatch.split(',')[0].trim()} 33%, ${opt.swatch.split(',')[1].trim()} 33% 66%, ${opt.swatch.split(',')[2].trim()} 66%)`)
                            : opt.swatch
                          ) : 'transparent',
                          border: opt.swatch ? '1px solid var(--color-core-light-grey)' : '1px dashed var(--color-core-light-grey)', 
                          borderRadius: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-core-dark-grey)',
                          fontSize: '10px'
                        }}
                      >
                        {!opt.swatch && '?'}
                      </div>
                    )}
                    <span style={{ fontWeight: 500 }}>{opt.value}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingOldKey(opt.value)
                        setNewKey(opt.value)
                        let sw = ['var(--color-core-black)']
                        if (opt.swatch) {
                          sw = opt.swatch.split(',').map(s => s.trim())
                        }
                        setColorValues(sw)
                        setShowAddModal(true)
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-core-black)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}
                      title="Редактировать"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDelete(opt.value)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-core-black)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem' }}
                      title="Удалить"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

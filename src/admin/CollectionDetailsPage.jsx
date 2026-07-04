import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from './api'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import AdminTableThumb from './AdminTableThumb'
import ImageUploadField from './ImageUploadField'
import { useAdminImageUpload } from './useAdminImageUpload'

export default function CollectionDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState(null)
  const [categories, setCategories] = useState([])
  const [catalogs, setCatalogs] = useState([])
  const [products, setProducts] = useState([])
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isEditingCatalogs, setIsEditingCatalogs] = useState(false)
  const [isEditingCategories, setIsEditingCategories] = useState(false)
  const [isEditingProducts, setIsEditingProducts] = useState(false)
  const [form, setForm] = useState(null)
  const imageUpload = useAdminImageUpload('collections')

  const load = async () => {
    try {
      setLoading(true)
      const [col, cats, prods, seasonsData, allCatalogs] = await Promise.all([
        api.getCollection(id),
        api.getCategories(true, id, true),
        api.getProducts(id),
        api.getSeasons(),
        api.getCollections({ kind: 'catalog' })
      ])
      setCollection(col)
      setCategories(cats)
      setProducts(prods)
      setSeasons(seasonsData)
      setCatalogs(allCatalogs.filter(c => String(c.parent_collection_id) === String(id)))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleCustomImageUpload = async (categoryId, file) => {
    if (!file) return
    setUploadingImage(true)
    setError('')
    try {
      const { url } = await api.uploadImage(file, 'categories')
      const newCategoryImages = { ...(collection.category_images || {}), [categoryId]: url }
      
      const updatedCollection = await api.updateCollection(collection.id, {
        ...collection,
        category_images: newCategoryImages
      })
      
      setCollection(updatedCollection)
      setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, image_url: url } : cat))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCustomImageReset = async (categoryId) => {
    if (!confirm('Вернуть автоматическое фото из товаров?')) return
    setUploadingImage(true)
    setError('')
    try {
      const newCategoryImages = { ...(collection.category_images || {}) }
      const oldUrl = newCategoryImages[categoryId]
      delete newCategoryImages[categoryId]
      
      const updatedCollection = await api.updateCollection(collection.id, {
        ...collection,
        category_images: newCategoryImages
      })
      
      if (oldUrl) {
        await api.deleteUploadedImage(oldUrl).catch(() => {})
      }
      
      const cats = await api.getCategories(true, collection.id)
      
      setCollection(updatedCollection)
      setCategories(cats)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleCategoryToggle = async (categoryId, isHidden) => {
    try {
      const currentHidden = Array.isArray(collection.hidden_categories) ? collection.hidden_categories : []
      let newHidden = []
      if (isHidden) {
        newHidden = [...currentHidden, categoryId]
      } else {
        newHidden = currentHidden.filter(id => id !== categoryId)
      }
      
      const updatedCollection = await api.updateCollection(collection.id, {
        ...collection,
        hidden_categories: newHidden
      })
      setCollection(updatedCollection)
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleCatalogPublished = async (cat) => {
    try {
      await api.updateCollection(cat.id, { ...cat, published: !cat.published })
      setCatalogs(prev => prev.map(c => c.id === cat.id ? { ...c, published: !c.published } : c))
    } catch (err) {
      setError(err.message)
    }
  }

  const updateCatalogPdf = async (cat, pdfUrl) => {
    if (cat.pdf_url === pdfUrl) return;
    try {
      await api.updateCollection(cat.id, { ...cat, pdf_url: pdfUrl })
      setCatalogs(prev => prev.map(c => c.id === cat.id ? { ...c, pdf_url: pdfUrl } : c))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleProductPublished = async (product) => {
    try {
      await api.updateProduct(product.id, { published: !product.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Удалить товар?')) return
    try {
      await api.deleteProduct(productId)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const openEdit = () => {
    setForm({
      name: collection.name,
      season_id: collection.season_id || '',
      description: collection.description || '',
      image_url: collection.image_url || '',
      published: !!collection.published,
      show_on_home: !!collection.show_on_home,
      is_new: !!collection.is_new,
      sort_order: collection.sort_order ?? 0,
    })
    imageUpload.initEdit(collection.image_url)
    setShowForm(true)
  }

  const closeForm = async () => {
    await imageUpload.discardPending()
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = { ...form, sort_order: parseInt(form.sort_order, 10) || 0 }
      await api.updateCollection(collection.id, data)
      await imageUpload.finalizeSave(form.image_url, collection.id)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="admin-page"><p className="admin-muted">Загрузка...</p></div>
  if (error) return <div className="admin-page"><p className="admin-error">{error}</p></div>
  if (!collection) return <div className="admin-page"><p className="admin-error">Коллекция не найдена</p></div>

  return (
    <div className="admin-page">
      <style>
        {`
          .image-overlay-container { position: relative; }
          .image-overlay-container .image-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; gap: 0.5rem; opacity: 0; transition: opacity 0.2s; border-radius: inherit; }
          .image-overlay-container:hover .image-overlay { opacity: 1; }
          .icon-btn { background: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #333; transition: transform 0.1s, background 0.2s; text-decoration: none; padding: 0; }
          .icon-btn:hover { transform: scale(1.1); background: #f0f0f0; }
          .icon-btn svg { width: 16px; height: 16px; display: block; }
        `}
      </style>
      <AdminPageHeader 
        title={`Коллекция: ${collection.name}`}
        hint={collection.season_name ? `Сезон: ${collection.season_name}` : ''}
      >
        <button type="button" className="admin-btn" onClick={() => navigate('/admin/collections')}>
          ← Назад к списку
        </button>
      </AdminPageHeader>

      {/* Collection Info Section */}
      {showForm ? (
        <form className="admin-form" onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
          <h2>Редактировать коллекцию</h2>
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
              <input type="checkbox" checked={form.show_on_home} onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })} />
              <span>Показывать на главной</span>
            </label>
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} />
              <span>Новинка (показывать в меню)</span>
            </label>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary">Сохранить</button>
            <button type="button" className="admin-btn" onClick={closeForm}>Отмена</button>
          </div>
        </form>
      ) : (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', gap: '2rem' }}>
          {collection.image_url ? (
            <div className="image-overlay-container" style={{ width: '200px', height: '200px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={collection.image_url} alt={collection.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div className="image-overlay">
                <a href={collection.image_url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="На весь экран">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </a>
                <a href={collection.image_url} download={`collection-${collection.id}.jpg`} className="icon-btn" title="Скачать">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </a>
              </div>
            </div>
          ) : (
            <div style={{ width: '200px', height: '200px', flexShrink: 0, borderRadius: '8px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
              Нет фото
            </div>
          )}
          <div style={{ flexGrow: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{collection.name}</h2>
              <button type="button" className="admin-btn admin-btn--primary" onClick={openEdit}>
                Редактировать
              </button>
            </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem 1rem', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <div style={{ color: '#888' }}>Сезон:</div>
            <div>{collection.season_name || '—'}</div>
            
            <div style={{ color: '#888' }}>Статус:</div>
            <div>
              <span className={`admin-badge ${collection.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                {collection.published ? 'Опубликована' : 'Не опубликована'}
              </span>
            </div>
            
            <div style={{ color: '#888' }}>На главной:</div>
            <div>{collection.show_on_home ? 'Да' : 'Нет'}</div>
            
            <div style={{ color: '#888' }}>Новинка:</div>
            <div>{collection.is_new ? 'Да' : 'Нет'}</div>
            
            <div style={{ color: '#888' }}>Порядок:</div>
            <div>{collection.sort_order}</div>
            
            <div style={{ color: '#888' }}>Категории:</div>
            <div style={{ gridColumn: '2 / -1' }}>
              {categories.length > 0 ? categories.map(c => c.name).join(', ') : '—'}
            </div>
          </div>

          {collection.description && (
            <div>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Описание:</div>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{collection.description}</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Catalogs Section */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Каталоги коллекции</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {catalogs.length > 0 && (
              <button 
                type="button" 
                className={`admin-btn ${isEditingCatalogs ? 'admin-btn--primary' : ''}`} 
                onClick={() => setIsEditingCatalogs(!isEditingCatalogs)}
              >
                {isEditingCatalogs ? 'Готово' : 'Редактировать'}
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => navigate('/admin/catalogs')}>
              Добавить каталог
            </button>
          </div>
        </div>
        <p className="admin-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Привязанные к этой коллекции PDF-каталоги. Управлять ими можно в разделе «Каталоги».
        </p>

        {catalogs.length === 0 ? (
          <p className="admin-muted">К этой коллекции не привязан ни один каталог.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {catalogs.map(cat => (
              <div key={cat.id} style={{ 
                width: '140px', 
                border: '1px solid #eee', 
                padding: '0.5rem', 
                borderRadius: '6px',
                textAlign: 'center',
                background: !cat.published ? '#f0f0f0' : '#fcfcfc',
                opacity: !cat.published ? 0.6 : 1,
                display: 'flex',
                flexDirection: 'column'
              }}>
                {isEditingCatalogs && (
                  <div style={{ marginBottom: '0.5rem', textAlign: 'left' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={cat.published} 
                        onChange={() => toggleCatalogPublished(cat)}
                      />
                      Отображать
                    </label>
                  </div>
                )}
                <div style={{ height: '140px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  {cat.image_url ? (
                    <img src={cat.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#999' }}>Нет обложки</span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cat.name}>
                  {cat.name}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  {isEditingCatalogs ? (
                    <input 
                      type="text" 
                      defaultValue={cat.pdf_url || ''} 
                      onBlur={(e) => updateCatalogPdf(cat, e.target.value)} 
                      placeholder="Ссылка на PDF"
                      style={{ fontSize: '0.75rem', padding: '0.25rem', width: '100%', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                    />
                  ) : cat.pdf_url ? (
                    <a href={cat.pdf_url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--small" style={{ fontSize: '0.75rem', display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
                      Смотреть PDF
                    </a>
                  ) : (
                    <span className="admin-muted" style={{ fontSize: '0.75rem' }}>Нет PDF</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Covers Section */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Обложки категорий</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {categories.length > 0 && (
              <button 
                type="button" 
                className={`admin-btn ${isEditingCategories ? 'admin-btn--primary' : ''}`} 
                onClick={() => setIsEditingCategories(!isEditingCategories)}
              >
                {isEditingCategories ? 'Готово' : 'Редактировать'}
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => navigate('/admin/products')}>
              Добавить категорию
            </button>
          </div>
        </div>
        <p className="admin-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          По умолчанию фото подтягивается из первого товара этой категории в коллекции. Здесь вы можете задать свое фото.
        </p>

        {categories.length === 0 ? (
          <p className="admin-muted">В этой коллекции пока нет товаров с категориями.</p>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const hasCustomImage = !!(collection.category_images && collection.category_images[cat.id])
              const isHidden = Array.isArray(collection.hidden_categories) && collection.hidden_categories.includes(cat.id)
              return (
                <div key={cat.id} style={{ 
                  width: '140px', 
                  border: '1px solid #eee', 
                  padding: '0.5rem', 
                  borderRadius: '6px',
                  textAlign: 'center',
                  background: isHidden ? '#f0f0f0' : '#fcfcfc',
                  opacity: isHidden ? 0.6 : 1
                }}>
                  {isEditingCategories && (
                    <div style={{ marginBottom: '0.5rem', textAlign: 'left' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={!isHidden} 
                          onChange={(e) => handleCategoryToggle(cat.id, !e.target.checked)}
                        />
                        Отображать
                      </label>
                    </div>
                  )}
                  <div className={cat.image_url ? "image-overlay-container" : ""} style={{ height: '90px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '4px' }}>
                    {cat.image_url ? (
                      <>
                        <img src={cat.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        <div className="image-overlay">
                          <a href={cat.image_url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="На весь экран" style={{ width: '28px', height: '28px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                          </a>
                          <a href={cat.image_url} download={`category-${cat.id}.jpg`} className="icon-btn" title="Скачать" style={{ width: '28px', height: '28px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                          </a>
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#999' }}>Нет фото</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cat.name}
                  </div>
                  
                  {isEditingCategories && (
                    hasCustomImage ? (
                      <button 
                        type="button" 
                        className="admin-btn" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', width: '100%', color: '#d32f2f' }}
                        onClick={() => handleCustomImageReset(cat.id)}
                        disabled={uploadingImage}
                      >
                        Сбросить фото
                      </button>
                    ) : (
                      <label className="admin-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', width: '100%', display: 'inline-block', boxSizing: 'border-box', cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                        Свое фото
                        <input 
                          type="file" 
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={uploadingImage}
                          onChange={(e) => {
                            if (e.target.files[0]) {
                              handleCustomImageUpload(cat.id, e.target.files[0])
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )
                  )}
                  {hasCustomImage && !isEditingCategories && (
                    <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem' }}>Свое фото</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>Товары в коллекции ({products.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {products.length > 0 && (
              <button 
                type="button" 
                className={`admin-btn ${isEditingProducts ? 'admin-btn--primary' : ''}`} 
                onClick={() => setIsEditingProducts(!isEditingProducts)}
              >
                {isEditingProducts ? 'Готово' : 'Редактировать'}
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => navigate('/admin/products')}>
              Добавить товар
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <p className="admin-muted">В этой коллекции пока нет товаров.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Фото</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Наличие</th>
                <th>Статус</th>
                {isEditingProducts && <th></th>}
              </tr>
            </thead>
            <tbody>
              {products.map((p, index) => (
                <tr key={p.id}>
                  <td className="admin-table__num">{index + 1}</td>
                  <td><AdminTableThumb url={p.image_url} alt={p.name} /></td>
                  <td>{p.name}</td>
                  <td>{p.category_name || p.category}</td>
                  <td>{p.price > 0 ? `${p.price} ₽` : '—'}</td>
                  <td>{p.in_stock ? 'В наличии' : 'Под заказ'}</td>
                  <td>
                    <span className={`admin-badge ${p.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                      {p.published ? 'Опубликован' : 'Скрыт'}
                    </span>
                  </td>
                  {isEditingProducts && (
                    <td className="admin-table__actions">
                      <AdminRowMenu
                        items={[
                          {
                            label: p.published ? 'Скрыть товар' : 'Опубликовать',
                            onClick: () => toggleProductPublished(p),
                          },
                          { label: 'Удалить', onClick: () => handleDeleteProduct(p.id), danger: true },
                        ]}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

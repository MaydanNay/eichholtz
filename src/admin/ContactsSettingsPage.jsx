import { useState, useEffect } from 'react'
import { getHomeSettings, saveHomeSettings } from '../api/homeSettings'
import { api } from './api'
import { DEFAULT_CONTACTS, INSTAGRAM_ICON_DATA, mergeContacts } from '../data/contacts'
import { invalidateContactsCache } from '../hooks/useContacts'

const INSTAGRAM_ICON = INSTAGRAM_ICON_DATA

export default function ContactsSettingsPage() {
  const [contacts, setContacts] = useState(DEFAULT_CONTACTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getHomeSettings()
      .then((settings) => {
        if (!cancelled) {
          try {
            const parsed = JSON.parse(settings.contacts_info || '{}')
            let migrated = mergeContacts(parsed)

            // Fix corrupted SVG data URIs if they were saved previously
            if (migrated.socials) {
              migrated.socials = migrated.socials.map((s) => {
                if (s.iconUrl && s.iconUrl.includes('%3Csvg') && s.iconUrl.includes('var(--color-core-white)')) {
                  return { ...s, iconUrl: INSTAGRAM_ICON }
                }
                return s
              })
            }

            if (parsed.facebook && typeof parsed.facebook === 'string') {
              migrated.socials = migrated.socials || []
              if (!migrated.socials.find((s) => s.name === 'Facebook')) {
                migrated.socials.push({ id: 'fb-migrated', name: 'Facebook', url: parsed.facebook, iconUrl: '' })
              }
            }
            setContacts(migrated)
          } catch (e) {
            setContacts(mergeContacts({}))
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          alert('Ошибка загрузки настроек')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setContacts((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddSocial = () => {
    setContacts(prev => ({
      ...prev,
      socials: [...(prev.socials || []), { id: Date.now().toString(), name: '', url: '', iconUrl: '' }]
    }))
  }

  const handleSocialChange = (id, field, value) => {
    setContacts(prev => ({
      ...prev,
      socials: prev.socials.map(s => s.id === id ? { ...s, [field]: value } : s)
    }))
  }

  const handleSocialDelete = (id) => {
    setContacts(prev => ({
      ...prev,
      socials: prev.socials.filter(s => s.id !== id)
    }))
  }

  const handleImageUpload = async (id, file) => {
    try {
      const data = await api.uploadImage(file, 'socials')
      handleSocialChange(id, 'iconUrl', data.url)
    } catch (err) {
      alert(err.message || 'Ошибка загрузки иконки')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveHomeSettings({
        contacts_info: JSON.stringify(contacts),
      })
      invalidateContactsCache(contacts)
      alert('Контакты успешно сохранены')
      setIsEditing(false)
    } catch (err) {
      alert(err.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-page"><p>Загрузка...</p></div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1 className="admin-page__title">Контакты</h1>
        {!isEditing && (
          <div className="admin-page__actions">
            <button className="admin-btn admin-btn--primary" onClick={() => setIsEditing(true)}>
              Редактировать
            </button>
          </div>
        )}
      </div>

      <div className="admin-page__content">
        {!isEditing ? (
          <div className="admin-form" style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Шоурумы и телефоны
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Астана</strong>
                <p style={{ margin: '0 0 0.5rem' }}>Телефон: {contacts.astanaPhone || 'Не указан'}</p>
                <p style={{ margin: '0' }}>Адрес: {contacts.astanaAddress || 'Не указан'}</p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Алматы</strong>
                <p style={{ margin: '0 0 0.5rem' }}>Телефон: {contacts.almatyPhone || 'Не указан'}</p>
                <p style={{ margin: '0' }}>Адрес: {contacts.almatyAddress || 'Не указан'}</p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              WhatsApp и email
            </h2>
            <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>WhatsApp</strong>
                <p style={{ margin: 0 }}>{contacts.whatsapp || contacts.astanaPhone || 'Не указан'}</p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Общая почта</strong>
                <p style={{ margin: 0 }}>{contacts.emailGeneral || 'Не указана'}</p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Сотрудничество / вакансии</strong>
                <p style={{ margin: 0 }}>{contacts.emailCoop || 'Не указана'}</p>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Contract email</strong>
                <p style={{ margin: 0 }}>{contacts.emailContract || 'Не указана'}</p>
              </div>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Contract (Hospitality / Branded)
            </h2>
            <div style={{ marginBottom: '2rem' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.25rem' }}>Телефон Contract</strong>
              <p style={{ margin: 0 }}>{contacts.contractPhone || 'Не указан'}</p>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Социальные сети
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {contacts.socials?.length ? contacts.socials.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {s.iconUrl ? (
                    <img src={s.iconUrl} alt={s.name} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', padding: '4px' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', background: 'var(--color-ui-bg-light)', borderRadius: '4px' }}></div>
                  )}
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.95rem' }}>{s.name || 'Без названия'}</strong>
                    <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--color-core-black)' }}>{s.url || 'Нет ссылки'}</a>
                  </div>
                </div>
              )) : (
                <p style={{ color: 'var(--color-core-dark-grey)' }}>Соцсети не добавлены</p>
              )}
            </div>
          </div>
        ) : (
          <form className="admin-form" onSubmit={handleSave} style={{ maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Астана
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Телефон (Астана)</span>
                <input
                  type="text"
                  name="astanaPhone"
                  value={contacts.astanaPhone}
                  onChange={handleChange}
                  placeholder="+7 700 743 24 59"
                />
              </label>
              
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Адрес (Астана)</span>
                <input
                  type="text"
                  name="astanaAddress"
                  value={contacts.astanaAddress}
                  onChange={handleChange}
                  placeholder="Проспект Мангилик Ел, 23/1"
                />
              </label>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Алматы
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Телефон (Алматы)</span>
                <input
                  type="text"
                  name="almatyPhone"
                  value={contacts.almatyPhone}
                  onChange={handleChange}
                  placeholder="+7 700 ..."
                />
              </label>

              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Адрес (Алматы)</span>
                <input
                  type="text"
                  name="almatyAddress"
                  value={contacts.almatyAddress}
                  onChange={handleChange}
                  placeholder="Аль-Фараби, 140/1"
                />
              </label>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              WhatsApp и email
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>WhatsApp (заявки с сайта)</span>
                <input
                  type="text"
                  name="whatsapp"
                  value={contacts.whatsapp || ''}
                  onChange={handleChange}
                  placeholder="+7 700 743 24 59"
                />
              </label>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Общая почта</span>
                <input
                  type="email"
                  name="emailGeneral"
                  value={contacts.emailGeneral || ''}
                  onChange={handleChange}
                  placeholder="info@ideadecor.kz"
                />
              </label>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Сотрудничество / вакансии</span>
                <input
                  type="email"
                  name="emailCoop"
                  value={contacts.emailCoop || ''}
                  onChange={handleChange}
                  placeholder="marketing@ideadecor.kz"
                />
              </label>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Contract email</span>
                <input
                  type="email"
                  name="emailContract"
                  value={contacts.emailContract || ''}
                  onChange={handleChange}
                  placeholder="contract@eichholtz.com"
                />
              </label>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Contract (Hospitality / Branded)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <label className="admin-field" style={{ marginBottom: 0 }}>
                <span>Телефон Contract</span>
                <input
                  type="text"
                  name="contractPhone"
                  value={contacts.contractPhone || ''}
                  onChange={handleChange}
                  placeholder="+31 25 275 5484"
                />
              </label>
            </div>

            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 500, paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-ui-bg-light)' }}>
              Социальные сети
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {contacts.socials?.map((s, idx) => (
                <div key={s.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem', border: '1px solid var(--color-core-light-grey)', borderRadius: '4px', background: 'var(--color-ui-bg-light)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                    {s.iconUrl ? (
                      <img src={s.iconUrl} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', border: '1px solid var(--color-core-light-grey)', background: 'transparent', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', border: '1px dashed var(--color-core-light-grey)', background: 'var(--color-core-white)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--color-core-dark-grey)' }}>Нет иконки</div>
                    )}
                    <label style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-core-black)', textDecoration: 'underline' }}>
                      Загрузить
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(s.id, e.target.files[0])
                          }
                        }} 
                      />
                    </label>
                  </div>
                  
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label className="admin-field" style={{ marginBottom: 0 }}>
                      <span>Название</span>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => handleSocialChange(s.id, 'name', e.target.value)}
                        placeholder="Instagram"
                      />
                    </label>
                    <label className="admin-field" style={{ marginBottom: 0 }}>
                      <span>Ссылка</span>
                      <input
                        type="url"
                        value={s.url}
                        onChange={(e) => handleSocialChange(s.id, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={() => handleSocialDelete(s.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-core-black)', cursor: 'pointer', padding: '0.5rem', alignSelf: 'center' }}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <button type="button" className="admin-btn" onClick={handleAddSocial}>
                + Добавить соцсеть
              </button>
            </div>

            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--color-core-light-grey)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={saving}
              >
                {saving ? 'Сохранение...' : 'Сохранить контакты'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

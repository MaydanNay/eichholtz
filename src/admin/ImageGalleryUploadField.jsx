import { useRef, useState } from 'react'
import { api } from './api'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function ImageGalleryUploadField({
  images,
  onAdd,
  onRemove,
  label = 'Изображения',
  category = 'products',
}) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setError('Файл слишком большой (макс. 5 МБ)')
      event.target.value = ''
      return
    }

    setError('')
    setUploading(true)
    try {
      const { url } = await api.uploadImage(file, category)
      await onAdd(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleRemove = async (url) => {
    if (uploading) return

    setError('')
    setUploading(true)
    try {
      await onRemove(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-field admin-field--full admin-image-gallery">
      <span>{label}</span>

      {images.length > 0 && (
        <ul className="admin-image-gallery__list">
          {images.map((url, index) => (
            <li key={url} className="admin-image-gallery__item">
              <img src={url} alt="" className="admin-image-gallery__preview" />
              <div className="admin-image-gallery__meta">
                {index === 0 && <span className="admin-image-gallery__badge">Главное</span>}
                <button
                  type="button"
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  disabled={uploading}
                  onClick={() => handleRemove(url)}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="admin-image-upload__pick"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? 'Загрузка...' : images.length ? 'Добавить изображение' : 'Выбрать файл'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="admin-image-upload__input"
        onChange={handleSelect}
      />

      {error && <p className="admin-image-upload__error">{error}</p>}
    </div>
  )
}

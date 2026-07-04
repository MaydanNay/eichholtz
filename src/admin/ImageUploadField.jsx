import { useRef, useState } from 'react'
import { api } from './api'

const MAX_FILE_SIZE = 5 * 1024 * 1024

export default function ImageUploadField({
  value,
  onChange,
  onRemove,
  label = 'Изображение',
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
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleRemove = async () => {
    if (uploading) return

    setError('')
    setUploading(true)
    try {
      if (onRemove) {
        await onRemove(value)
      } else {
        onChange('')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="admin-field admin-field--full admin-image-upload">
      <span>{label}</span>

      {value ? (
        <div className="admin-image-upload__preview-wrap">
          <img src={value} alt="" className="admin-image-upload__preview" />
          <div className="admin-image-upload__actions">
            <button
              type="button"
              className="admin-btn admin-btn--sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Загрузка...' : 'Заменить'}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--sm admin-btn--danger"
              disabled={uploading}
              onClick={handleRemove}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="admin-image-upload__pick"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Загрузка...' : 'Выбрать файл'}
        </button>
      )}

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

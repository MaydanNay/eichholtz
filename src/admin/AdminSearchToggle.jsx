import { useEffect, useRef, useState } from 'react'
import { useAdminSearch } from './AdminSearchContext'

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  )
}

export default function AdminSearchToggle() {
  const { query, setQuery } = useAdminSearch()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (query.trim()) {
      setOpen(true)
    }
  }, [query])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleToggle = () => {
    setOpen((prev) => !prev)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <div
      ref={rootRef}
      className={`admin-search-toggle${open ? ' admin-search-toggle--open' : ''}`}
    >
      <form className="admin-search-toggle__control" onSubmit={handleSubmit}>
        <button
          type="button"
          className="admin-search-toggle__btn"
          onClick={handleToggle}
          aria-label={open ? 'Свернуть поиск' : 'Открыть поиск'}
          aria-expanded={open}
        >
          <IconSearch />
        </button>
        <input
          ref={inputRef}
          type="search"
          className="admin-search-toggle__input"
          placeholder="Поиск..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Поиск по разделу"
        />
      </form>
    </div>
  )
}

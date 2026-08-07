import { useEffect, useId, useRef, useState } from 'react'

export default function AdminRowMenu({ items }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const openMenu = () => {
    const trigger = rootRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuWidth = 220
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    )

    setMenuStyle({
      bottom: window.innerHeight - rect.top + 6,
      left,
      minWidth: menuWidth,
    })
    setOpen(true)
  }

  const handleSelect = (item) => {
    setOpen(false)
    item.onClick()
  }

  return (
    <div className="admin-row-menu" ref={rootRef}>
      <button
        type="button"
        className="admin-row-menu__trigger"
        aria-label="Действия"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="3" r="1.25" fill="currentColor" />
          <circle cx="8" cy="8" r="1.25" fill="currentColor" />
          <circle cx="8" cy="13" r="1.25" fill="currentColor" />
        </svg>
      </button>

      {open && menuStyle && (
        <div
          id={menuId}
          className="admin-row-menu__dropdown"
          role="menu"
          style={menuStyle}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`admin-row-menu__item${item.danger ? ' admin-row-menu__item--danger' : ''}`}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

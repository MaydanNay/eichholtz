import { useState } from 'react'
import { useFavorites } from '../context/FavoritesContext'
import { useCart } from '../context/CartContext'

export default function FavoritesDrawer({ isOpen, onClose, onCartOpen }) {
  const { favorites, syncing, actionError, removeFavorite } = useFavorites()
  const { addToCart, isInCart } = useCart()
  const [removingId, setRemovingId] = useState(null)
  const [isMoving, setIsMoving] = useState(false)

  const handleRemove = async (productId) => {
    setRemovingId(productId)
    try {
      await removeFavorite(productId)
    } catch {
      // rollback handled in context
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = async (product) => {
    try {
      if (!isInCart(product.id)) {
        await addToCart(product)
      }
    } catch {
      // ignore
    }
  }

  const handleMoveAll = async () => {
    if (isMoving) return
    setIsMoving(true)
    try {
      await Promise.all(
        favorites.map((p) => {
          if (!isInCart(p.id)) {
            return addToCart(p)
          }
          return Promise.resolve()
        })
      )
      if (onCartOpen) {
        onCartOpen()
      }
    } catch {
      // ignore error
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <>
      <div
        className={`favorites-overlay${isOpen ? ' favorites-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`favorites-drawer${isOpen ? ' favorites-drawer--open' : ''}`}
        aria-hidden={!isOpen}
        aria-label="Избранное"
      >
        <div className="favorites-drawer__header">
          <h2 className="favorites-drawer__title">
            Избранное
            {favorites.length > 0 && (
              <span className="favorites-drawer__count">{favorites.length}</span>
            )}
          </h2>
          <button
            type="button"
            className="favorites-drawer__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="favorites-drawer__body">
          {actionError && <p className="favorites-drawer__error">{actionError}</p>}
          {syncing ? (
            <p className="favorites-drawer__empty">Загрузка...</p>
          ) : favorites.length === 0 ? (
            <p className="favorites-drawer__empty">В избранном пока ничего нет.</p>
          ) : (
            <>
              <ul className="favorites-drawer__list">
                {favorites.map((product) => (
                <li key={product.id} className="favorites-drawer__item">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="favorites-drawer__img" />
                  ) : (
                    <div className="favorites-drawer__placeholder" />
                  )}
                  <div className="favorites-drawer__info">
                    {(product.collection_name || product.category) && (
                      <p className="favorites-drawer__category">
                        {product.collection_name || product.category}
                      </p>
                    )}
                    <p className="favorites-drawer__name">{product.name}</p>
                    <button
                      type="button"
                      className="favorites-drawer__add-cart"
                      onClick={() => handleAddToCart(product)}
                      disabled={isInCart(product.id)}
                    >
                      {isInCart(product.id) ? 'В корзине' : 'В корзину'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="favorites-drawer__remove"
                    aria-label="Убрать из избранного"
                    disabled={removingId === product.id}
                    onClick={() => handleRemove(product.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 1l12 12M13 1L1 13" />
                    </svg>
                  </button>
                </li>
              ))}
              </ul>
              <div className="favorites-drawer__footer">
                <button
                  type="button"
                  className="favorites-drawer__move-all"
                  onClick={handleMoveAll}
                  disabled={isMoving || favorites.every((p) => isInCart(p.id))}
                >
                  {isMoving ? 'Перенос...' : 'Перенести все в корзину'}
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

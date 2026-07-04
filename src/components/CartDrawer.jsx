import { useState } from 'react'
import { useCart } from '../context/CartContext'

function formatPrice(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return 'По запросу'
  return `${amount.toLocaleString('ru-RU')} ₸`
}

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
  const { cartItems, count, total, syncing, actionError, updateQuantity, removeFromCart } = useCart()
  const [busyId, setBusyId] = useState(null)

  const handleQuantity = async (productId, nextQuantity) => {
    setBusyId(productId)
    try {
      await updateQuantity(productId, nextQuantity)
    } catch {
      // rollback handled in context
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (productId) => {
    setBusyId(productId)
    try {
      await removeFromCart(productId)
    } catch {
      // rollback handled in context
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div
        className={`cart-overlay${isOpen ? ' cart-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <aside
        className={`cart-drawer${isOpen ? ' cart-drawer--open' : ''}`}
        aria-hidden={!isOpen}
        aria-label="Корзина"
      >
        <div className="cart-drawer__header">
          <h2 className="cart-drawer__title">
            Моя корзина
            {count > 0 && <span className="cart-drawer__count">{count}</span>}
          </h2>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="cart-drawer__body">
          {actionError && <p className="cart-drawer__error">{actionError}</p>}
          {syncing ? (
            <p className="cart-drawer__empty">Загрузка...</p>
          ) : cartItems.length === 0 ? (
            <p className="cart-drawer__empty">У вас нет товаров в корзине.</p>
          ) : (
            <>
              <ul className="cart-drawer__list">
                {cartItems.map((item) => (
                  <li key={item.id} className="cart-drawer__item">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="cart-drawer__img" />
                    ) : (
                      <div className="cart-drawer__placeholder" />
                    )}
                    <div className="cart-drawer__info">
                      {(item.collection_name || item.category) && (
                        <p className="cart-drawer__category">
                          {item.collection_name || item.category}
                        </p>
                      )}
                      <p className="cart-drawer__name">{item.name}</p>
                      <p className="cart-drawer__price">{formatPrice(item.price)}</p>
                      <div className="cart-drawer__qty">
                        <button
                          type="button"
                          className="cart-drawer__qty-btn"
                          aria-label="Уменьшить количество"
                          disabled={busyId === item.id || item.quantity <= 1}
                          onClick={() => handleQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="cart-drawer__qty-value">{item.quantity}</span>
                        <button
                          type="button"
                          className="cart-drawer__qty-btn"
                          aria-label="Увеличить количество"
                          disabled={busyId === item.id || item.quantity >= 99}
                          onClick={() => handleQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cart-drawer__remove"
                      aria-label="Удалить из корзины"
                      disabled={busyId === item.id}
                      onClick={() => handleRemove(item.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 1l12 12M13 1L1 13" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="cart-drawer__footer">
                {total > 0 ? (
                  <p className="cart-drawer__total">
                    Итого: <strong>{formatPrice(total)}</strong>
                  </p>
                ) : (
                  <p className="cart-drawer__total cart-drawer__total--muted">
                    Стоимость уточняется менеджером
                  </p>
                )}
                <button
                  type="button"
                  className="cart-drawer__checkout"
                  onClick={onCheckout}
                >
                  Оформить заявку
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

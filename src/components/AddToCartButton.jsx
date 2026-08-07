import { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function AddToCartButton({ product, className = '', variant = 'card', onAdded }) {
  const { addToCart, isInCart } = useCart()
  const [busy, setBusy] = useState(false)
  const inCart = isInCart(product.id)

  const handleClick = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (busy) return

    setBusy(true)
    try {
      await addToCart(product)
      onAdded?.()
    } catch {
      // rollback handled in context
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`${variant === 'page' ? 'product-page__cart-btn' : 'product-card__btn product-card__btn--cart'}${inCart && variant !== 'page' ? ' product-card__btn--in-cart' : ''}${inCart && variant === 'page' ? ' product-page__cart-btn--in-cart' : ''}${className ? ` ${className}` : ''}`}
      disabled={busy}
      onClick={handleClick}
    >
      {busy ? 'Добавление...' : inCart ? 'В корзине' : 'В корзину'}
    </button>
  )
}

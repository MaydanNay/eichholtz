import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'

export default function ActionToast() {
  const { actionError: cartError, clearError: clearCartError } = useCart()
  const { actionError: favoritesError, clearError: clearFavoritesError } = useFavorites()

  const message = cartError || favoritesError
  if (!message) return null

  const handleClose = () => {
    if (cartError) clearCartError()
    if (favoritesError) clearFavoritesError()
  }

  return (
    <div className="action-toast" role="alert">
      <span>{message}</span>
      <button type="button" className="action-toast__close" onClick={handleClose} aria-label="Закрыть">
        ×
      </button>
    </div>
  )
}

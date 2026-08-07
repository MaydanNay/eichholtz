import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { favoritesApi } from '../api/favorites'
import { useActionError } from '../hooks/useActionError'
import { useSyncRetry } from '../hooks/useSyncRetry'
import { AUTH_LOGOUT_EVENT, createScopedStorage } from '../utils/scopedStorage'
import { useAuth } from './AuthContext'

const storage = createScopedStorage('favorites', 'favorites_owner_user_id')

const FavoritesContext = createContext(null)

function pickProduct(product) {
  return {
    id: product.id,
    name: product.name,
    image_url: product.image_url || '',
    category: product.category || '',
    collection_name: product.collection_name || '',
  }
}

export function FavoritesProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [items, setItems] = useState(storage.loadItems)
  const [syncing, setSyncing] = useState(false)
  const syncedUserRef = useRef(false)
  const prevUserIdRef = useRef(null)
  const { actionError, pushError, clearError } = useActionError()
  const isActive = isAuthenticated && !!user?.id
  const { syncAttempt, markSyncFailed, markSyncSucceeded, resetSyncRetry } = useSyncRetry(isActive, syncing)

  const favorites = useMemo(() => Object.values(items), [items])
  const count = favorites.length

  const setItemsAndSave = useCallback((nextItems) => {
    setItems(nextItems)
    storage.saveItems(nextItems)
  }, [])

  useEffect(() => {
    const handleLogout = (event) => {
      const userId = event.detail?.userId
      if (userId) storage.setOwnerId(userId)
      storage.clearItems()
      setItems({})
    }

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout)
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      syncedUserRef.current = false
      prevUserIdRef.current = null
      resetSyncRetry()
      setItems(storage.loadItems())
      return undefined
    }

    if (syncedUserRef.current) return undefined

    const switchedByStorage = storage.isAccountSwitch(user.id)
    const switchedBySession = prevUserIdRef.current != null && prevUserIdRef.current !== user.id
    const accountSwitch = switchedByStorage || switchedBySession
    prevUserIdRef.current = user.id

    let cancelled = false

    async function syncWithServer() {
      setSyncing(true)
      const localItems = accountSwitch ? {} : storage.loadItems()

      if (accountSwitch) {
        setItemsAndSave({})
      }

      try {
        if (!accountSwitch) {
          const results = await Promise.all(
            Object.keys(localItems).map((id) =>
              favoritesApi.add(Number(id)).then(() => true).catch(() => false),
            ),
          )

          if (results.includes(false)) {
            pushError('Не все товары из избранного удалось синхронизировать')
          }
        }

        const serverItems = await favoritesApi.list()
        if (cancelled) return

        const merged = {}
        for (const product of serverItems) {
          merged[product.id] = pickProduct(product)
        }
        setItemsAndSave(merged)
        storage.setOwnerId(user.id)
        syncedUserRef.current = true
        markSyncSucceeded()
        clearError()
      } catch {
        if (!cancelled) {
          setItems(storage.loadItems())
          storage.setOwnerId(user.id)
          markSyncFailed()
          pushError('Не удалось синхронизировать избранное')
        }
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    syncWithServer()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id, syncAttempt, setItemsAndSave, pushError, clearError, markSyncFailed, markSyncSucceeded, resetSyncRetry])

  const isFavorite = useCallback((productId) => !!items[productId], [items])

  const toggleFavorite = useCallback(async (product) => {
    const productId = product.id
    const previousItems = items
    const wasFavorite = !!items[productId]

    if (wasFavorite) {
      const nextItems = { ...items }
      delete nextItems[productId]
      setItemsAndSave(nextItems)

      if (isAuthenticated) {
        try {
          await favoritesApi.remove(productId)
        } catch {
          setItemsAndSave(previousItems)
          const message = 'Не удалось удалить из избранного'
          pushError(message)
          throw new Error(message)
        }
      }
      return
    }

    const nextItems = { ...items, [productId]: pickProduct(product) }
    setItemsAndSave(nextItems)

    if (isAuthenticated) {
      try {
        await favoritesApi.add(productId)
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось добавить в избранное'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [items, isAuthenticated, setItemsAndSave, pushError])

  const removeFavorite = useCallback(async (productId) => {
    if (!items[productId]) return

    const previousItems = items
    const nextItems = { ...items }
    delete nextItems[productId]
    setItemsAndSave(nextItems)

    if (isAuthenticated) {
      try {
        await favoritesApi.remove(productId)
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось удалить из избранного'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [items, isAuthenticated, setItemsAndSave, pushError])

  const value = useMemo(
    () => ({
      favorites,
      count,
      syncing,
      actionError,
      clearError,
      isFavorite,
      toggleFavorite,
      removeFavorite,
    }),
    [favorites, count, syncing, actionError, clearError, isFavorite, toggleFavorite, removeFavorite],
  )

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider')
  }
  return context
}

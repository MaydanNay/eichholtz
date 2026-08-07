import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cartApi } from '../api/cart'
import { useActionError } from '../hooks/useActionError'
import { useSyncRetry } from '../hooks/useSyncRetry'
import { AUTH_LOGOUT_EVENT, createScopedStorage } from '../utils/scopedStorage'
import { useAuth } from './AuthContext'

const storage = createScopedStorage('cart', 'cart_owner_user_id')

const CartContext = createContext(null)

function pickCartItem(product, quantity = 1) {
  return {
    id: product.id,
    name: product.name,
    image_url: product.image_url || '',
    category: product.category || '',
    collection_name: product.collection_name || '',
    price: Number(product.price) || 0,
    quantity: Math.max(1, Math.min(99, quantity)),
  }
}

function mapServerItem(item) {
  return pickCartItem(item, item.quantity)
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [items, setItems] = useState(storage.loadItems)
  const [syncing, setSyncing] = useState(false)
  const syncedUserRef = useRef(false)
  const prevUserIdRef = useRef(null)
  const { actionError, pushError, clearError } = useActionError()
  const isActive = isAuthenticated && !!user?.id
  const { syncAttempt, markSyncFailed, markSyncSucceeded, resetSyncRetry } = useSyncRetry(isActive, syncing)

  const cartItems = useMemo(
    () => Object.values(items).sort((a, b) => a.id - b.id),
    [items],
  )

  const count = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  )

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.price > 0 ? item.price * item.quantity : 0), 0),
    [cartItems],
  )

  const setItemsAndSave = useCallback((updater) => {
    setItems((prevItems) => {
      const nextItems = typeof updater === 'function' ? updater(prevItems) : updater
      storage.saveItems(nextItems)
      return nextItems
    })
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
        let serverItems = []
        try {
          serverItems = await cartApi.list()
        } catch {
          serverItems = []
        }

        if (!accountSwitch) {
          const serverMap = Object.fromEntries(serverItems.map((item) => [item.id, item]))

          await Promise.all(
            Object.values(localItems).map(async (item) => {
              try {
                const serverItem = serverMap[item.id]
                const mergedQty = Math.min(
                  99,
                  Math.max(item.quantity, serverItem?.quantity || 0),
                )

                if (serverItem) {
                  if (mergedQty !== serverItem.quantity) {
                    await cartApi.setQuantity(item.id, mergedQty)
                  }
                  return
                }

                await cartApi.add(item.id, item.quantity)
              } catch (err) {
                console.warn(`Failed to sync cart item ${item.id}:`, err.message)
              }
            }),
          )
        }

        const freshItems = await cartApi.list()
        if (cancelled) return

        const merged = {}
        for (const item of freshItems) {
          merged[item.id] = mapServerItem(item)
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
          pushError('Не удалось синхронизировать корзину')
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

  const isInCart = useCallback((productId) => !!items[productId], [items])

  const addToCart = useCallback(async (product, quantity = 1) => {
    const productId = product.id
    const delta = Math.max(1, Math.min(99, quantity))
    let previousItems = null

    setItemsAndSave((prev) => {
      previousItems = prev
      const existing = prev[productId]
      const nextQuantity = existing
        ? Math.min(99, existing.quantity + delta)
        : delta

      return {
        ...prev,
        [productId]: pickCartItem(product, nextQuantity),
      }
    })

    if (isAuthenticated) {
      try {
        await cartApi.add(productId, delta)
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось добавить в корзину'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [isAuthenticated, setItemsAndSave, pushError])

  const updateQuantity = useCallback(async (productId, quantity) => {
    let previousItems = null
    let shouldUpdate = false
    const nextQuantity = Math.max(1, Math.min(99, quantity))

    setItemsAndSave((prev) => {
      if (!prev[productId]) return prev
      previousItems = prev
      shouldUpdate = true
      return {
        ...prev,
        [productId]: { ...prev[productId], quantity: nextQuantity },
      }
    })

    if (!shouldUpdate) return

    if (isAuthenticated) {
      try {
        await cartApi.setQuantity(productId, nextQuantity)
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось обновить количество'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [isAuthenticated, setItemsAndSave, pushError])

  const removeFromCart = useCallback(async (productId) => {
    let previousItems = null
    let shouldUpdate = false

    setItemsAndSave((prev) => {
      if (!prev[productId]) return prev
      previousItems = prev
      shouldUpdate = true
      const nextItems = { ...prev }
      delete nextItems[productId]
      return nextItems
    })

    if (!shouldUpdate) return

    if (isAuthenticated) {
      try {
        await cartApi.remove(productId)
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось удалить из корзины'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [isAuthenticated, setItemsAndSave, pushError])

  const clearCart = useCallback(async () => {
    let previousItems = null
    
    setItemsAndSave((prev) => {
      previousItems = prev
      return {}
    })

    if (isAuthenticated) {
      try {
        await Promise.all(Object.keys(previousItems).map((id) => cartApi.remove(Number(id))))
      } catch {
        setItemsAndSave(previousItems)
        const message = 'Не удалось очистить корзину'
        pushError(message)
        throw new Error(message)
      }
    }
  }, [isAuthenticated, setItemsAndSave, pushError])

  const value = useMemo(
    () => ({
      cartItems,
      count,
      total,
      syncing,
      actionError,
      clearError,
      isInCart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, count, total, syncing, actionError, clearError, isInCart, addToCart, updateQuantity, removeFromCart, clearCart],
  )

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

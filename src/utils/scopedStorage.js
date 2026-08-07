export function createScopedStorage(storageKey, ownerKey) {
  function loadItems() {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return parsed.items && typeof parsed.items === 'object' ? parsed.items : {}
    } catch {
      return {}
    }
  }

  function saveItems(items) {
    localStorage.setItem(storageKey, JSON.stringify({ items }))
  }

  function clearItems() {
    localStorage.removeItem(storageKey)
  }

  function getOwnerId() {
    return localStorage.getItem(ownerKey)
  }

  function setOwnerId(userId) {
    if (userId == null) {
      localStorage.removeItem(ownerKey)
      return
    }
    localStorage.setItem(ownerKey, String(userId))
  }

  function isAccountSwitch(userId) {
    const ownerId = getOwnerId()
    return ownerId != null && ownerId !== String(userId)
  }

  return {
    loadItems,
    saveItems,
    clearItems,
    getOwnerId,
    setOwnerId,
    isAccountSwitch,
  }
}

export const AUTH_LOGOUT_EVENT = 'auth:logout'

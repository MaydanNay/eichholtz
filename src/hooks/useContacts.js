import { useState, useEffect } from 'react'
import {
  DEFAULT_CONTACTS,
  mergeContacts,
  getCachedContacts,
  setCachedContacts,
  clearCachedContacts,
} from '../data/contacts'

let fetchPromise = null

function loadContacts() {
  if (!fetchPromise) {
    fetchPromise = fetch('/api/home-settings/settings')
      .then((res) => {
        if (!res.ok) throw new Error(`contacts settings ${res.status}`)
        return res.json()
      })
      .then((settings) => {
        try {
          const parsed = JSON.parse(settings.contacts_info || '{}')
          const merged = mergeContacts(parsed)
          setCachedContacts(merged)
          return merged
        } catch {
          const merged = mergeContacts({})
          setCachedContacts(merged)
          return merged
        }
      })
      .catch(() => {
        const merged = mergeContacts({})
        setCachedContacts(merged)
        return merged
      })
  }
  return fetchPromise
}

/** Wait until contacts are loaded into the shared cache (safe for WhatsApp helpers). */
export function ensureContactsLoaded() {
  return loadContacts()
}

/** After admin save: update cache immediately and allow a fresh refetch later. */
export function invalidateContactsCache(nextContacts = null) {
  clearCachedContacts()
  fetchPromise = null
  if (nextContacts) {
    const merged = mergeContacts(nextContacts)
    setCachedContacts(merged)
    fetchPromise = Promise.resolve(merged)
  }
}

export function useContacts() {
  const [contacts, setContacts] = useState(() => getCachedContacts())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    loadContacts().then((data) => {
      if (isMounted) {
        setContacts(data)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  return { contacts, loading }
}

export { DEFAULT_CONTACTS }

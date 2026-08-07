import { useCallback, useEffect, useRef, useState } from 'react'

export function useSyncRetry(isActive, syncing) {
  const syncFailedRef = useRef(false)
  const [syncAttempt, setSyncAttempt] = useState(0)

  const markSyncFailed = useCallback(() => {
    syncFailedRef.current = true
  }, [])

  const markSyncSucceeded = useCallback(() => {
    syncFailedRef.current = false
  }, [])

  const resetSyncRetry = useCallback(() => {
    syncFailedRef.current = false
    setSyncAttempt(0)
  }, [])

  useEffect(() => {
    if (!isActive) {
      syncFailedRef.current = false
      return undefined
    }

    const tryRetry = () => {
      if (!syncFailedRef.current || syncing) return
      if (!navigator.onLine) return
      setSyncAttempt((attempt) => attempt + 1)
    }

    window.addEventListener('online', tryRetry)

    const onVisible = () => {
      if (document.visibilityState === 'visible') tryRetry()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('online', tryRetry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isActive, syncing])

  return {
    syncAttempt,
    markSyncFailed,
    markSyncSucceeded,
    resetSyncRetry,
  }
}

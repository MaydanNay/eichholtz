import { useCallback, useEffect, useState } from 'react'

export function useActionError(timeoutMs = 4000) {
  const [actionError, setActionError] = useState('')

  const pushError = useCallback((message) => {
    if (message) setActionError(message)
  }, [])

  const clearError = useCallback(() => {
    setActionError('')
  }, [])

  useEffect(() => {
    if (!actionError) return undefined

    const timer = setTimeout(() => setActionError(''), timeoutMs)
    return () => clearTimeout(timer)
  }, [actionError, timeoutMs])

  return { actionError, pushError, clearError }
}

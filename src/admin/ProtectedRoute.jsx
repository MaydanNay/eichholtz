import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { api, clearToken, isLoggedIn } from './api'

export default function ProtectedRoute() {
  const [status, setStatus] = useState(isLoggedIn() ? 'checking' : 'unauthorized')

  useEffect(() => {
    if (!isLoggedIn()) {
      setStatus('unauthorized')
      return
    }

    api.me()
      .then((user) => {
        if (user.role !== 'admin') {
          clearToken()
          setStatus('unauthorized')
          return
        }
        setStatus('authorized')
      })
      .catch(() => {
        clearToken()
        setStatus('unauthorized')
      })
  }, [])

  if (status === 'checking') {
    return <p className="admin-muted" style={{ padding: '2rem' }}>Проверка доступа...</p>
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}

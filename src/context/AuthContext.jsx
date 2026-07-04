import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearUserToken,
  hasUserToken,
  setUserToken,
  userAuth,
} from '../api/userAuth'
import { AUTH_LOGOUT_EVENT } from '../utils/scopedStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(hasUserToken())

  useEffect(() => {
    if (!hasUserToken()) {
      setLoading(false)
      return
    }

    userAuth.me()
      .then((data) => {
        if (data.role === 'customer') {
          setUser(data)
        } else {
          clearUserToken()
          setUser(null)
        }
      })
      .catch(() => {
        clearUserToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const { token, user: nextUser } = await userAuth.login(email, password)
    if (nextUser.role !== 'customer') {
      throw new Error('Используйте вход через админ-панель')
    }
    setUserToken(token)
    setUser(nextUser)
    return nextUser
  }

  const register = async (payload) => {
    const { token, user: nextUser } = await userAuth.register(payload)
    setUserToken(token)
    setUser(nextUser)
    return nextUser
  }

  const logout = () => {
    if (user?.id) {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT, { detail: { userId: user.id } }))
    }
    clearUserToken()
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, loading],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

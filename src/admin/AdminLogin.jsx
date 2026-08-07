import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, setToken } from './api'
import './admin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add('admin-mode')
    return () => {
      document.documentElement.classList.remove('admin-mode')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token } = await api.login(email, password)
      setToken(token)
      navigate('/admin/products')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login custom-scroll">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <h1 className="admin-login__title">Админ-панель</h1>
        <p className="admin-login__subtitle">Eichholtz Казахстан</p>

        {error && <p className="admin-login__error">{error}</p>}

        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="admin-field">
          <span>Пароль</span>
          <div className="admin-field__password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="admin-field__toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 003.5 3.5M7.1 7.7C5.6 8.8 4.3 10.2 3 12c2.5 4 6.5 6 9 6 1.2 0 2.5-.4 3.8-1.1M9.9 5.1A10.7 10.7 0 0112 5c2.5 0 6.5 2 9 6-1 1.6-2.2 3-3.5 4" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <button type="submit" className="admin-btn admin-btn--primary" disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}

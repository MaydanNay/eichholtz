import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useContacts } from '../hooks/useContacts'
import { userAuth } from '../api/userAuth'
import {
  formatOrderDate,
  formatOrderItems,
  formatOrderMoney,
  orderStatusLabel,
} from '../utils/orderFormat'

const LOGIN_FORM = { email: '', password: '' }
const REGISTER_FORM = { name: '', phone: '', password: '', confirm: '', privacyAccepted: false }

function IconEye({ hidden }) {
  if (hidden) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 3l18 18M10.5 10.7a2.5 2.5 0 003.5 3.5M7.1 7.7C5.6 8.8 4.3 10.2 3 12c2.5 4 6.5 6 9 6 1.2 0 2.5-.4 3.8-1.1M9.9 5.1A10.7 10.7 0 0112 5c2.5 0 6.5 2 9 6-1 1.6-2.2 3-3.5 4" />
      </svg>
    )
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required = true,
  showMinLengthHint = false,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(false)

  const showHint = showMinLengthHint && minLength && (focused || value.length > 0)
  const isValid = value.length >= minLength
  const isTooShort = value.length > 0 && value.length < minLength

  return (
    <label className="modal__field">
      <span>{label}</span>
      <div className="modal__password">
        <input
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          aria-describedby={showHint ? 'password-length-hint' : undefined}
        />
        <button
          type="button"
          className="modal__password-toggle"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
        >
          <IconEye hidden={showPassword} />
        </button>
      </div>
      {showHint && (
        <span
          id="password-length-hint"
          className={`modal__field-hint${isValid ? ' modal__field-hint--ok' : ''}${isTooShort ? ' modal__field-hint--warn' : ''}`}
        >
          {isValid
            ? 'Пароль подходит'
            : `Пароль должен быть не короче ${minLength} символов`}
        </span>
      )}
    </label>
  )
}

const MIN_PASSWORD_LENGTH = 8

export default function AuthModal({ isOpen, initialTab = 'login', onClose }) {
  const { user, isAuthenticated, login, register, logout } = useAuth()
  const { contacts } = useContacts()
  const [tab, setTab] = useState(initialTab)
  const [loginForm, setLoginForm] = useState(LOGIN_FORM)
  const [registerForm, setRegisterForm] = useState(REGISTER_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const privacyPolicyUrl = String(contacts.privacyPolicyUrl || '').trim()

  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated && user) {
        // If already authenticated, close modal
        onClose()
      } else {
        setTab(initialTab)
      }
      setError('')
    } else {
      setLoginForm(LOGIN_FORM)
      setRegisterForm(REGISTER_FORM)
      setError('')
      setLoading(false)
    }
  }, [isOpen, initialTab, isAuthenticated, user, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(loginForm.email.trim(), loginForm.password)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()
    setError('')

    if (!registerForm.phone.trim()) {
      setError('Введите телефон')
      return
    }

    if (registerForm.password !== registerForm.confirm) {
      setError('Пароли не совпадают')
      return
    }

    if (registerForm.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`)
      return
    }

    if (!registerForm.privacyAccepted) {
      setError('Подтвердите согласие с политикой конфиденциальности')
      return
    }

    setLoading(true)
    try {
      await register({
        name: registerForm.name.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal auth-modal" role="dialog" aria-labelledby="auth-modal-title">
        <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        <>
          <h2 id="auth-modal-title" className="modal__title">
            {tab === 'register' ? 'Регистрация' : 'Вход'}
          </h2>

          <div className="auth-modal__tabs">
            <button
              type="button"
              className={`auth-modal__tab${tab === 'login' ? ' auth-modal__tab--active' : ''}`}
              onClick={() => {
                setTab('login')
                setError('')
              }}
            >
              Вход
            </button>
            <button
              type="button"
              className={`auth-modal__tab${tab === 'register' ? ' auth-modal__tab--active' : ''}`}
              onClick={() => {
                setTab('register')
                setError('')
              }}
            >
              Регистрация
            </button>
          </div>

          {error && <p className="modal__error">{error}</p>}

          {tab === 'login' ? (
            <form className="modal__form" onSubmit={handleLogin}>
              <label className="modal__field">
                <span>Телефон или email</span>
                <input
                  type="text"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })}
                  required
                  autoComplete="username"
                />
              </label>
              <PasswordField
                label="Пароль"
                value={loginForm.password}
                onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                autoComplete="current-password"
              />
              <button type="submit" className="auth-modal__submit" disabled={loading}>
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          ) : (
            <form className="modal__form" onSubmit={handleRegister}>
              <label className="modal__field">
                <span>Имя</span>
                <input
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm({ ...registerForm, name: event.target.value })}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="modal__field">
                <span>Телефон</span>
                <input
                  type="tel"
                  value={registerForm.phone}
                  onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })}
                  required
                  autoComplete="tel"
                />
              </label>
              <PasswordField
                label="Пароль"
                value={registerForm.password}
                onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                showMinLengthHint
              />
              <PasswordField
                label="Повторите пароль"
                value={registerForm.confirm}
                onChange={(event) => setRegisterForm({ ...registerForm, confirm: event.target.value })}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
              <label className="auth-modal__consent">
                <input
                  type="checkbox"
                  checked={registerForm.privacyAccepted}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, privacyAccepted: event.target.checked })
                  }
                  required
                />
                <span>
                  Я согласен с{' '}
                  {privacyPolicyUrl ? (
                    <a
                      href={privacyPolicyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      политикой конфиденциальности
                    </a>
                  ) : (
                    'политикой конфиденциальности'
                  )}
                </span>
              </label>
              <button type="submit" className="auth-modal__submit" disabled={loading}>
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </form>
          )}
        </>
      </div>
    </>
  )
}

import { useEffect, useState } from 'react'
import { api } from '../admin/api'
import { DESIGNER_WORK_FORMATS } from '../data/designers'

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  telegram: '',
  city: '',
  workFormat: DESIGNER_WORK_FORMATS[0],
  company: '',
}

export default function DesignersInquiryModal({ isOpen, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM, workFormat: DESIGNER_WORK_FORMATS[0] })
      setError('')
      setSent(false)
      setSubmitting(false)
    }
  }, [isOpen])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Пожалуйста, заполните имя')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError('Пожалуйста, введите e-mail адрес')
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      return setError('Пожалуйста, введите корректный номер телефона')
    }

    const message = [
      'Заявка в программу лояльности для дизайнеров',
      `Формат работы: ${form.workFormat}`,
      form.whatsapp.trim() && `WhatsApp: ${form.whatsapp.trim()}`,
      form.telegram.trim() && `Telegram: ${form.telegram.trim()}`,
      form.city.trim() && `Город: ${form.city.trim()}`,
      form.company.trim() && `Компания: ${form.company.trim()}`,
    ].filter(Boolean).join('\n')

    setSubmitting(true)
    try {
      await api.submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        message,
      })
      setSent(true)
      setForm({ ...EMPTY_FORM, workFormat: DESIGNER_WORK_FORMATS[0] })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div
        className="modal modal--wide"
        role="dialog"
        aria-labelledby="designers-modal-title"
        aria-modal="true"
      >
        <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {sent ? (
          <div className="modal__success">
            <p>Заявка отправлена</p>
            <p className="modal__success-sub">Мы свяжемся с вами в ближайшее время</p>
          </div>
        ) : (
          <>
            <h2 id="designers-modal-title" className="modal__title">ФОРМА ЗАЯВКИ</h2>
            <p className="modal__lead">
              Присоединяйтесь к программе и получите доступ ко всем преимуществам.
            </p>

            {error && <p className="modal__error">{error}</p>}

            <form className="designers-form__fields" onSubmit={handleSubmit}>
              <label className="designers-form__field">
                <span>Ваше имя*</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>

              <label className="designers-form__field">
                <span>Ваш e-mail*</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>

              <label className="designers-form__field">
                <span>Ваш телефон*</span>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </label>

              <label className="designers-form__field">
                <span>Whatsapp</span>
                <input
                  type="tel"
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </label>

              <label className="designers-form__field">
                <span>Имя в телеграм</span>
                <input
                  type="text"
                  name="telegram"
                  value={form.telegram}
                  onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                />
              </label>

              <label className="designers-form__field">
                <span>Ваш город</span>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </label>

              <fieldset className="designers-form__field designers-form__field--full designers-form__radios">
                <legend>Формат работы</legend>
                {DESIGNER_WORK_FORMATS.map((option) => (
                  <label key={option} className="designers-form__radio">
                    <input
                      type="radio"
                      name="workFormat"
                      value={option}
                      checked={form.workFormat === option}
                      onChange={(e) => setForm({ ...form, workFormat: e.target.value })}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </fieldset>

              <label className="designers-form__field designers-form__field--full">
                <span>Название компании/агентства</span>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </label>

              <p className="designers-form__note">* – обязательно к заполнению</p>

              <button type="submit" className="designers-form__submit" disabled={submitting}>
                {submitting ? 'Отправка...' : 'Отправить заявку'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}

import { useState } from 'react'
import { submitInquiry } from '../api/inquiries'

const EMPTY = { name: '', email: '', phone: '' }

export default function PriceInquiryForm({ productName }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Пожалуйста, заполните имя')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return setError('Пожалуйста, введите e-mail адрес')
    }
    if (form.phone.replace(/\D/g, '').length < 10) {
      return setError('Пожалуйста, введите корректный номер телефона')
    }

    setSubmitting(true)
    try {
      await submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        product_name: productName,
      })
      setSent(true)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="price-inquiry-form price-inquiry-form--success">
        <p>Заявка отправлена</p>
        <p className="price-inquiry-form__sub">Мы свяжемся с вами в ближайшее время</p>
      </div>
    )
  }

  return (
    <form className="price-inquiry-form" onSubmit={handleSubmit}>
      {productName && <p className="price-inquiry-form__product">{productName}</p>}
      {error && <p className="modal__error">{error}</p>}

      <label className="modal__field">
        <span>Ваше имя</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </label>
      <label className="modal__field">
        <span>Ваш Email</span>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
      </label>
      <label className="modal__field">
        <span>Ваш телефон</span>
        <input
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          required
        />
      </label>
      <button type="submit" className="modal__submit" disabled={submitting}>
        {submitting ? 'Отправка...' : 'Отправить заявку'}
      </button>
    </form>
  )
}

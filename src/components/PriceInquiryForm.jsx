import { useState } from 'react'
import { submitInquiry } from '../api/inquiries'
import { openInquiryWhatsApp } from '../utils/inquiryWhatsApp'

const EMPTY = { name: '', phone: '' }

export default function PriceInquiryForm({ productName }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const name = form.name.trim()
    const phone = form.phone.trim()

    if (!name) return setError('Пожалуйста, заполните имя')
    if (phone.replace(/\D/g, '').length < 10) {
      return setError('Пожалуйста, введите корректный номер телефона')
    }

    setSubmitting(true)
    try {
      await submitInquiry({
        name,
        email: '',
        phone,
        product_name: productName,
      })
      openInquiryWhatsApp({ name, phone, productName })
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
        <p className="price-inquiry-form__sub">
          Заявка сохранена, и открыт чат WhatsApp — отправьте сообщение менеджеру, если окно не открылось само.
        </p>
      </div>
    )
  }

  return (
    <form className="price-inquiry-form" onSubmit={handleSubmit}>
      {productName && <p className="price-inquiry-form__product">{productName}</p>}
      {error && <p className="modal__error">{error}</p>}

      <label className="modal__field">
        <span>Ваше имя *</span>
        <input
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </label>
      <label className="modal__field">
        <span>Ваш телефон *</span>
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
      <p className="price-inquiry-form__note">* – обязательно к заполнению</p>
    </form>
  )
}

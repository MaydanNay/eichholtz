import { useEffect, useMemo, useState } from 'react'
import { submitInquiry } from '../api/inquiries'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { openInquiryWhatsApp } from '../utils/inquiryWhatsApp'
import { useProductGalleryImages } from '../utils/useProductGalleryImages'

const EMPTY_FORM = { name: '', phone: '', message: '' }

function formatPrice(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return 'По запросу'
  return `${amount.toLocaleString('ru-RU')} ₸`
}

async function fetchProduct(id) {
  const res = await fetch(`/api/products/${id}`)
  if (!res.ok) return null
  return res.json()
}

export default function CartCheckoutModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth()
  const { cartItems, total, clearCart } = useCart()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [details, setDetails] = useState({})
  const [expanded, setExpanded] = useState({})
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM)
      setError('')
      setSent(false)
      setSubmitting(false)
      setDetails({})
      setExpanded({})
      setActiveId(null)
      setActiveImageIndex(0)
      return
    }

    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      message: '',
    })

    if (cartItems.length) {
      setActiveId(cartItems[0].id)
    }

    let cancelled = false

    async function loadDetails() {
      setLoadingDetails(true)
      try {
        const entries = await Promise.all(
          cartItems.map(async (item) => {
            const product = await fetchProduct(item.id)
            return [item.id, product || item]
          }),
        )
        if (!cancelled) {
          setDetails(Object.fromEntries(entries))
        }
      } finally {
        if (!cancelled) setLoadingDetails(false)
      }
    }

    loadDetails()

    return () => {
      cancelled = true
    }
  }, [isOpen, user, cartItems.map((item) => `${item.id}:${item.quantity}`).join('|')])

  const activeItem = useMemo(
    () => cartItems.find((item) => item.id === activeId) || cartItems[0],
    [cartItems, activeId],
  )

  const activeDetails = activeItem ? (details[activeItem.id] || activeItem) : null
  const galleryImages = useProductGalleryImages(activeDetails)

  useEffect(() => {
    setActiveImageIndex(0)
  }, [activeItem?.id, galleryImages.length])

  if (!isOpen) return null

  if (!cartItems.length && !sent) {
    return (
      <>
        <div className="modal-overlay checkout-modal-overlay" onClick={onClose} />
        <div className="checkout-modal checkout-modal--empty" role="dialog">
          <button type="button" className="modal__close checkout-modal__close" onClick={onClose} aria-label="Закрыть">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
          <p className="checkout-modal__empty-msg">Корзина пуста</p>
        </div>
      </>
    )
  }

  const toggleSection = (productId, section) => {
    const key = `${productId}:${section}`
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isExpanded = (productId, section) => !!expanded[`${productId}:${section}`]

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const name = form.name.trim()
    const phone = form.phone.trim()
    const message = form.message.trim()

    if (!name) return setError('Пожалуйста, заполните имя')
    if (phone.replace(/\D/g, '').length < 10) {
      return setError('Пожалуйста, введите корректный номер телефона')
    }
    if (!cartItems.length) return setError('Корзина пуста')

    const waPayload = { name, phone, message, cartItems, total }

    setSubmitting(true)
    try {
      await submitInquiry({
        name,
        email: '',
        phone,
        message,
        total,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.quantity,
          price: item.price,
          image_url: item.image_url,
          collection_name: item.collection_name || item.category,
        })),
      })

      try {
        await clearCart()
      } catch {
        // заявка уже создана — не блокируем успех из‑за ошибки очистки корзины
      }

      openInquiryWhatsApp(waPayload)
      setSent(true)
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="modal-overlay checkout-modal-overlay" onClick={onClose} />
      <div className="checkout-modal" role="dialog" aria-labelledby="checkout-modal-title">
        <button type="button" className="modal__close checkout-modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {sent ? (
          <div className="checkout-modal__success modal__success">
            <p>Заявка отправлена</p>
            <p className="modal__success-sub">
              Заявка сохранена, и открыт чат WhatsApp — отправьте сообщение менеджеру, если окно не открылось само.
            </p>
            <button type="button" className="checkout-modal__done" onClick={onClose}>
              Закрыть
            </button>
          </div>
        ) : (
          <div className="checkout-modal__layout">
            <div className="checkout-modal__form-col">
              <div className="checkout-modal__form-scroll">
              <h2 id="checkout-modal-title" className="checkout-modal__title">Оформление заявки</h2>
              <p className="checkout-modal__lead">
                Заполните контактные данные — мы подготовим предложение по выбранным товарам.
              </p>

              {error && <p className="modal__error">{error}</p>}

              <form className="checkout-modal__form" onSubmit={handleSubmit}>
                <label className="modal__field">
                  <span>Ваше имя *</span>
                  <input
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    autoComplete="name"
                  />
                </label>
                <label className="modal__field">
                  <span>Телефон *</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    required
                    autoComplete="tel"
                  />
                </label>
                <label className="modal__field">
                  <span>Комментарий</span>
                  <textarea
                    className="checkout-modal__textarea"
                    rows={4}
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    placeholder="Адрес доставки, пожелания, вопросы..."
                  />
                </label>

                <p className="checkout-modal__note">* – обязательно к заполнению</p>

                <div className="checkout-modal__summary">
                  <span>Товаров: {cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  <span>
                    {total > 0 ? `Итого: ${formatPrice(total)}` : 'Стоимость уточняется менеджером'}
                  </span>
                </div>

                <button type="submit" className="modal__submit" disabled={submitting || !cartItems.length}>
                  {submitting ? 'Отправка...' : 'Отправить заявку'}
                </button>
              </form>
              </div>
            </div>

            <div className="checkout-modal__products-col">
              <div className="checkout-modal__products-scroll">
              <h3 className="checkout-modal__products-title">Ваш заказ</h3>

              {loadingDetails && (
                <p className="checkout-modal__loading">Загрузка товаров...</p>
              )}

              <div className="checkout-modal__thumbs">
                {cartItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`checkout-modal__thumb${activeId === item.id ? ' checkout-modal__thumb--active' : ''}`}
                    onClick={() => {
                      setActiveId(item.id)
                      setActiveImageIndex(0)
                    }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt="" />
                    ) : (
                      <span className="checkout-modal__thumb-placeholder" />
                    )}
                    <span className="checkout-modal__thumb-qty">{item.quantity}</span>
                  </button>
                ))}
              </div>

              {activeItem && activeDetails && (
                <article className="checkout-modal__product">
                  <div className="checkout-modal__product-media">
                    {galleryImages.length > 0 ? (
                      <>
                        <img 
                          src={galleryImages[activeImageIndex] || galleryImages[0]} 
                          alt="" 
                          className="checkout-modal__product-img" 
                        />
                        {galleryImages.length > 1 && (
                          <div className="product-page__thumbs" style={{ marginTop: '1rem' }}>
                            {galleryImages.map((src, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`product-page__thumb${idx === activeImageIndex ? ' product-page__thumb--active' : ''}`}
                                onClick={() => setActiveImageIndex(idx)}
                              >
                                <img src={src} alt="" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="checkout-modal__product-placeholder" />
                    )}
                  </div>

                  <div className="checkout-modal__product-head">
                    {(activeDetails.collection_name || activeDetails.category) && (
                      <p className="checkout-modal__product-category">
                        {activeDetails.collection_name || activeDetails.category}
                      </p>
                    )}
                    <h4 className="checkout-modal__product-name">{activeDetails.name}</h4>
                    <p className="checkout-modal__product-price">
                      {formatPrice(activeDetails.price)} · {activeItem.quantity} шт.
                    </p>
                  </div>

                  <div className="checkout-modal__sections">
                    <div className="checkout-modal__tabs">
                      <button
                        type="button"
                        className={`checkout-modal__tab${(expanded[activeItem.id] || 'description') === 'description' ? ' checkout-modal__tab--active' : ''}`}
                        onClick={() => setExpanded((prev) => ({ ...prev, [activeItem.id]: 'description' }))}
                      >
                        Описание
                      </button>
                      <button
                        type="button"
                        className={`checkout-modal__tab${expanded[activeItem.id] === 'details' ? ' checkout-modal__tab--active' : ''}`}
                        onClick={() => setExpanded((prev) => ({ ...prev, [activeItem.id]: 'details' }))}
                      >
                        Характеристики
                      </button>
                    </div>

                    <div className="checkout-modal__section-body">
                      {(expanded[activeItem.id] || 'description') === 'description' ? (
                        <div style={{ paddingTop: '0.5rem' }}>
                          {activeDetails.description?.trim()
                            ? activeDetails.description
                            : 'Подробное описание будет предоставлено менеджером.'}
                        </div>
                      ) : (
                        <dl className="checkout-modal__specs" style={{ paddingTop: '0.5rem' }}>
                          <div>
                            <dt>Коллекция</dt>
                            <dd>{activeDetails.collection_name || activeDetails.category || '—'}</dd>
                          </div>
                          <div>
                            <dt>Наличие</dt>
                            <dd>{activeDetails.in_stock === false ? 'Под заказ' : 'В наличии'}</dd>
                          </div>
                          <div>
                            <dt>Количество</dt>
                            <dd>{activeItem.quantity}</dd>
                          </div>
                          <div>
                            <dt>Цена за единицу</dt>
                            <dd>{formatPrice(activeDetails.price)}</dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </div>
                </article>
              )}

              <ul className="checkout-modal__list">
                {cartItems.map((item) => (
                  <li key={item.id} className="checkout-modal__list-item">
                    <span>{item.name}</span>
                    <span>{item.quantity} × {formatPrice(item.price)}</span>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

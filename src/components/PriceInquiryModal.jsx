import { useEffect } from 'react'
import PriceInquiryForm from './PriceInquiryForm'

export default function PriceInquiryModal({ isOpen, product, onClose }) {
  const productName = typeof product === 'string' ? product : product?.name

  useEffect(() => {
    if (!isOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-labelledby="price-modal-title">
        <button type="button" className="modal__close" onClick={onClose} aria-label="Закрыть">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        <h2 id="price-modal-title" className="modal__title">Узнать стоимость товара</h2>
        <PriceInquiryForm
          key={productName || 'inquiry'}
          productName={productName}
        />
      </div>
    </>
  )
}

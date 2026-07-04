import { useState } from 'react'
import { Link } from 'react-router-dom'
import { productUrl } from '../utils/productUrl'
import FavoriteButton from './FavoriteButton'
import AddToCartButton from './AddToCartButton'

export default function ProductCard({ product, style, onCartOpen, onPriceInquiry }) {
  const [activeImage, setActiveImage] = useState(0)

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images.filter(Boolean)
    : product.image_url ? [product.image_url] : []

  const handlePrev = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  return (
    <article className="product-card" style={style}>
      <div className="product-card__media">
        <Link to={productUrl(product)} className="product-card__link product-card__link--media">
          {images.length > 0 ? (
            <img src={images[activeImage]} alt="" className="product-card__img" />
          ) : (
            <img src="/logo.webp" alt="" className="product-card__img img-fallback" />
          )}
        </Link>
        
        {images.length > 1 && (
          <>
            <button className="product-card__arrow product-card__arrow--prev" onClick={handlePrev} aria-label="Предыдущее фото">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="product-card__arrow product-card__arrow--next" onClick={handleNext} aria-label="Следующее фото">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <div className="product-card__dots">
              {images.map((_, idx) => (
                <span key={idx} className={`product-card__dot${idx === activeImage ? ' product-card__dot--active' : ''}`} />
              ))}
            </div>
          </>
        )}

        <FavoriteButton product={product} />
      </div>
      
      <div className="product-card__body">
        {product.category_name && (
          <p className="product-card__category">{product.category_name}</p>
        )}
        {!product.category_name && product.collection_name && (
          <p className="product-card__category">{product.collection_name}</p>
        )}
        {!product.category_name && !product.collection_name && product.category && (
          <p className="product-card__category">{product.category}</p>
        )}
        <h3 className="product-card__name">
          <Link to={productUrl(product)} className="product-card__link">
            {product.name}
          </Link>
        </h3>
        <div className="product-card__actions">
          <AddToCartButton product={product} onAdded={onCartOpen} />
          <button
            type="button"
            className="product-card__btn product-card__btn--outline"
            onClick={() => onPriceInquiry(product)}
          >
            Узнать цену
          </button>
        </div>
      </div>
    </article>
  )
}

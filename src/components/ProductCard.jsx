import { Link } from 'react-router-dom'
import { openInquiryWhatsApp } from '../utils/inquiryWhatsApp'
import { productUrl } from '../utils/productUrl'
import { useProductGalleryImages } from '../utils/useProductGalleryImages'
import FavoriteButton from './FavoriteButton'
import AddToCartButton from './AddToCartButton'

export default function ProductCard({ product, style, onCartOpen }) {
  const images = useProductGalleryImages(product)

  const handlePriceInquiry = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const path = productUrl(product)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    openInquiryWhatsApp({
      productName: product.name,
      productLink: origin ? `${origin}${path}` : path,
    })
  }

  return (
    <article className="product-card" style={style}>
      <div className="product-card__media">
        <Link to={productUrl(product)} className={`product-card__link product-card__link--media ${images.length > 1 ? 'has-hover' : ''}`}>
          {images.length > 0 ? (
            <>
              <img 
                src={images[0]} 
                alt={product.name || ''} 
                className="product-card__img" 
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null
                  if (images[0] && images[0].includes('/media/catalog/product/') && !images[0].includes('/cache/')) {
                    e.target.src = images[0].replace('/media/catalog/product/', '/media/catalog/product/cache/dc09e1c71e492175f875827bcbf6a37c/')
                  } else {
                    e.target.src = '/logo.webp'
                    e.target.classList.add('img-fallback')
                  }
                }}
              />
              {images.length > 1 && (
                <img 
                  src={images[1]} 
                  alt={product.name || ''} 
                  className="product-card__img product-card__img--hover" 
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.style.display = 'none'
                  }}
                />
              )}
            </>
          ) : (
            <img src="/logo.webp" alt="" className="product-card__img img-fallback" />
          )}
        </Link>

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
            onClick={handlePriceInquiry}
          >
            Узнать цену
          </button>
        </div>
      </div>
    </article>
  )
}

import { getProductCollectionBadges } from '../utils/productCollectionBadges'

export default function ProductCollectionBadges({ product, className = '' }) {
  const badges = getProductCollectionBadges(product)
  if (badges.length === 0) return null

  return (
    <div className={`product-collection-badges${className ? ` ${className}` : ''}`} aria-hidden="true">
      {badges.map((badge) => (
        <img
          key={badge.id}
          src={badge.src}
          alt=""
          className={`product-collection-badges__img product-collection-badges__img--${badge.id}`}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  )
}

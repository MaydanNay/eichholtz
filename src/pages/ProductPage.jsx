import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getProduct, getProducts } from '../api/products'
import AddToCartButton from '../components/AddToCartButton'
import FavoriteButton from '../components/FavoriteButton'
import PriceInquiryForm from '../components/PriceInquiryForm'
import Reveal from '../components/Reveal'
import { usePageMeta } from '../hooks/usePageMeta'
import { useCart } from '../context/CartContext'
import { categoryUrl } from '../utils/categoryUrl'
import { collectionUrl } from '../utils/collectionUrl'
import { productUrl } from '../utils/productUrl'
import { useProductGalleryImages } from '../utils/useProductGalleryImages'

function formatPrice(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return null
  return `${amount.toLocaleString('ru-RU')} ₸`
}

function normalizeSpecs(specs) {
  let value = specs
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!value || typeof value !== 'object') return []

  const labelMap = {
    sku: 'Артикул',
    color: 'Цвет',
    material: 'Материал',
    finish: 'Отделка',
    fabric: 'Ткань',
    shape: 'Форма',
    product_group: 'Группа товаров',
    dimensions: 'Габариты',
    height: 'Высота',
    width: 'Ширина',
    depth: 'Глубина',
    diameter: 'Диаметр',
    weight: 'Вес',
    assembly: 'Сборка',
    indoor_outdoor: 'Применение',
    country_of_origin: 'Страна производства'
  }

  const entries = []

  if (value.specifications && typeof value.specifications === 'object') {
    for (const [k, v] of Object.entries(value.specifications)) {
      if (v) entries.push([k, k, String(v)])
    }
  }

  for (const [k, v] of Object.entries(value)) {
    if (!v || ['extra_collections', 'extra_categories', 'objectID', 'specifications', 'care_instructions', 'dimensions'].includes(k)) continue
    const label = labelMap[k.toLowerCase()] || k
    const displayVal = Array.isArray(v) ? v.join(', ') : String(v)
    if (!entries.some(([key]) => key.toLowerCase() === k.toLowerCase())) {
      entries.push([k, label, displayVal])
    }
  }
  return entries
}

export default function ProductPage({ productId, onCartOpen, onCheckout }) {
  const { productSlug } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [buying, setBuying] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [activeTab, setActiveTab] = useState('description')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [productId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setActiveImage(0)

    getProduct(productId)
      .then(async (data) => {
        if (cancelled) return
        setProduct(data)
        setActiveTab('description')
        if (data.collection_id) {
          const items = await getProducts({ collectionId: data.collection_id }).catch(() => [])
          if (!cancelled) {
            setRelated(items.filter((item) => item.id !== data.id).slice(0, 4))
          }
        } else if (!cancelled) {
          setRelated([])
        }
      })
      .catch((err) => {
        if (cancelled) return
        setProduct(null)
        setRelated([])
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  useEffect(() => {
    if (!product || !productSlug) return
    if (product.id !== productId) return
    const canonicalSlug = productUrl(product).replace('/tproduct/', '')
    if (productSlug !== canonicalSlug) {
      navigate(productUrl(product), { replace: true })
    }
  }, [product, productSlug, navigate])

  usePageMeta({
    enabled: !!product,
    title: product?.name,
    description: product?.description?.trim()
      ? product.description.trim().slice(0, 160)
      : `${product?.name || 'Товар'} — каталог Eichholtz Казахстан`,
    image: product?.image_url,
    path: product ? productUrl(product) : undefined,
    type: 'product',
  })

  const specs = useMemo(() => normalizeSpecs(product?.specs), [product])
  const galleryImages = useProductGalleryImages(product)

  useEffect(() => {
    setActiveImage(0)
  }, [productId, galleryImages.length])

  const handleBuyNow = async () => {
    if (!product || buying) return
    setBuying(true)
    try {
      await addToCart(product)
      onCheckout?.()
    } catch {
      // handled in context
    } finally {
      setBuying(false)
    }
  }

  if (loading && !product) {
    return (
      <div className="product-page">
        <p className="product-page__status">Загрузка...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-page product-page--empty">
        <p className="product-page__status">{error || 'Товар не найден'}</p>
        <Link to="/" className="link-underline">На главную</Link>
      </div>
    )
  }

  const price = formatPrice(product.price)

  return (
    <article className="product-page">
      <Reveal variant="fade">
        <nav className="product-page__breadcrumb" aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span aria-hidden="true">/</span>

          {product.collection_id && (
            <>
              {product.collection_season_name && (
                <>
                  <span>{product.collection_season_name}</span>
                  <span aria-hidden="true">/</span>
                </>
              )}
              <Link to={collectionUrl({ id: product.collection_id, name: product.collection_name, kind: 'collection' })}>
                {product.collection_name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}

          {product.catalog_id && (
            <>
              <Link to={collectionUrl({ id: product.catalog_id, name: product.catalog_name, kind: 'catalog' })}>
                {product.catalog_name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}

          {!product.collection_id && !product.catalog_id && (
            <>
              <Link to="/catalog">Каталог</Link>
              <span aria-hidden="true">/</span>
            </>
          )}

          {product.category_parent_id && (
            <>
              <Link to={categoryUrl({ id: product.category_parent_id, name: product.category_parent_name })}>
                {product.category_parent_name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}

          {product.category_id && (
            <>
              <Link to={categoryUrl({ id: product.category_id, name: product.category_name })}>
                {product.category_name}
              </Link>
              <span aria-hidden="true">/</span>
            </>
          )}

          <span>{product.name}</span>
        </nav>
      </Reveal>

      <div className="product-page__layout">
        <Reveal className="product-page__gallery" variant="up">
          {galleryImages.length > 0 ? (
            <>
              <img
                src={galleryImages[activeImage] || galleryImages[0]}
                alt={product.name}
                className="product-page__image"
              />
              {galleryImages.length > 1 && (
                <div className="product-page__thumbs">
                  {galleryImages.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      className={`product-page__thumb${index === activeImage ? ' product-page__thumb--active' : ''}`}
                      aria-label={`Изображение ${index + 1}`}
                      onClick={() => setActiveImage(index)}
                    >
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="product-page__image product-page__image--placeholder" />
          )}
        </Reveal>

        <Reveal className="product-page__info" variant="up" delay={80}>
          {product.collection_name && (
            <p className="product-page__category">
              {product.collection_name}
            </p>
          )}

          <h1 className="product-page__title">{product.name}</h1>

          {product.specs?.sku && (
            <p className="product-page__category-subtitle" style={{ fontSize: '0.85rem', color: 'var(--color-core-dark-grey)', marginBottom: '0.5rem' }}>
              Item no: {product.specs.sku}
            </p>
          )}

          {product.category && (
            <p className="product-page__category-subtitle">
              Категория: {product.category}
            </p>
          )}

          {price ? (
            <p className="product-page__price">{price}</p>
          ) : (
            <p className="product-page__price product-page__price--muted">Цена по запросу</p>
          )}

          <div className="product-page__actions">
            <button
              type="button"
              className="product-page__buy"
              disabled={buying}
              onClick={handleBuyNow}
            >
              {buying ? 'Добавление...' : 'Купить сейчас'}
            </button>
            <AddToCartButton product={product} variant="page" onAdded={onCartOpen} />
            <FavoriteButton product={product} className="product-page__favorite" />
          </div>

          <div className="product-page__tabs-container">
            <div className="product-page__tabs-header">
              <button
                type="button"
                className={`product-page__tab-btn ${activeTab === 'description' ? 'product-page__tab-btn--active' : ''}`}
                onClick={() => setActiveTab('description')}
              >
                Описание
              </button>
              <button
                type="button"
                className={`product-page__tab-btn ${activeTab === 'specs' ? 'product-page__tab-btn--active' : ''}`}
                onClick={() => setActiveTab('specs')}
              >
                Характеристики
              </button>
              {product.specs?.dimensions && (
                <button
                  type="button"
                  className={`product-page__tab-btn ${activeTab === 'dimensions' ? 'product-page__tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('dimensions')}
                >
                  Размеры
                </button>
              )}
              {product.specs?.care_instructions && (
                <button
                  type="button"
                  className={`product-page__tab-btn ${activeTab === 'care' ? 'product-page__tab-btn--active' : ''}`}
                  onClick={() => setActiveTab('care')}
                >
                  Уход
                </button>
              )}
            </div>

            <div className="product-page__tabs-content">
              {activeTab === 'description' && (
                <div className="product-page__description">
                  {product.description?.trim() ? (
                    product.description.split('\n').filter(Boolean).map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))
                  ) : (
                    <p className="product-page__no-data">Описание подгружается...</p>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="product-page__specs-tab">
                  {specs.length > 0 && (
                    <dl className="product-page__specs">
                      {specs.map(([key, label, value]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="product-page__extra-details">
                    <p>
                      {product.in_stock === false
                        ? 'Товар доступен под заказ. Сроки и условия поставки уточняет менеджер.'
                        : 'Товар доступен к заказу. Доставка и сборка обсуждаются индивидуально.'}
                    </p>
                    {product.collection_name && (
                      <p>Коллекция: {product.collection_name}</p>
                    )}
                    {product.category && (
                      <p>Категория: {product.category}</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'dimensions' && (
                <div className="product-page__description">
                  <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{product.specs.dimensions}</p>
                </div>
              )}

              {activeTab === 'care' && (
                <div className="product-page__description">
                  <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>{product.specs.care_instructions}</p>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal className="product-page__inquiry" variant="up" delay={120}>
        <h2 className="product-page__inquiry-title">Узнать стоимость товара</h2>
        <PriceInquiryForm productName={product.name} />
      </Reveal>

      {related.length > 0 && (
        <Reveal className="product-page__related" variant="up" delay={160}>
          <h2 className="product-page__related-title">Больше продуктов</h2>
          <div className="product-page__related-grid">
            {related.map((item) => (
              <Link key={item.id} to={productUrl(item)} className="product-page__related-card">
                {item.image_url ? (
                  <img src={item.image_url} alt="" />
                ) : (
                  <div className="product-page__related-placeholder" />
                )}
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </article>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCategory, getCategories } from '../api/categories'
import { getProducts } from '../api/products'
import ProductsCatalogSection from '../sections/ProductsCatalogSection'
import Reveal from '../components/Reveal'
import { usePageMeta } from '../hooks/usePageMeta'
import { categorySlugPath, categoryUrl } from '../utils/categoryUrl'

function findRootCategory(cats, cat) {
  let current = cat
  const byId = new Map(cats.map((c) => [c.id, c]))
  while (current?.parent_id) {
    const parent = byId.get(current.parent_id)
    if (!parent) break
    current = parent
  }
  return current
}

export default function CategoryPage({ categoryId, onCartOpen }) {
  const { categorySlug } = useParams()
  const navigate = useNavigate()
  const [category, setCategory] = useState(null)
  const [displayCategory, setDisplayCategory] = useState(null)
  const [parentCategory, setParentCategory] = useState(null)
  const [rootCategory, setRootCategory] = useState(null)
  const [otherCategories, setOtherCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [categoryId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getCategory(categoryId)
      .then((data) => {
        if (cancelled) return
        if (!data.published) {
          setError('Категория не найдена')
          setCategory(null)
          return
        }
        setCategory(data)

        getCategories(true)
          .then((cats) => {
            if (cancelled) return

            const isRoot = data.parent_id == null
            const root = isRoot ? data : findRootCategory(cats, data)
            const immediateParent = data.parent_id
              ? cats.find((c) => c.id === data.parent_id) || null
              : null
            const rootSubs = root
              ? cats.filter((c) => c.parent_id === root.id)
              : []

            // Hero always shows the catalog root (Мебель / Освещение / …),
            // including when browsing any nested subcategory.
            setDisplayCategory(root || data)
            setRootCategory(root || data)
            setParentCategory(immediateParent)
            setSubcategories(rootSubs)
            setOtherCategories(
              cats.filter((c) => c.parent_id == null && c.id !== (root || data).id),
            )

            // Product count for this page's category tree (includes nested).
            getProducts({ categoryId: String(data.id) })
              .then((prods) => {
                if (!cancelled) setTotalProducts(prods.length)
              })
              .catch(() => {
                if (!cancelled) setTotalProducts(0)
              })
          })
          .catch(() => {
            if (cancelled) return
            setDisplayCategory(data)
            setRootCategory(data)
            setParentCategory(null)
            setSubcategories([])
            setOtherCategories([])
          })
      })
      .catch(() => {
        if (!cancelled) {
          setCategory(null)
          setError('Категория не найдена')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [categoryId])

  useEffect(() => {
    if (!category || !categorySlug) return
    if (category.id !== categoryId) return
    const expectedSlug = categorySlugPath(category)
    if (categorySlug !== expectedSlug) {
      navigate(categoryUrl(category), { replace: true })
    }
  }, [category, categorySlug, navigate, categoryId])

  usePageMeta({
    enabled: !!category,
    title: category?.name,
    description: category?.description?.trim()
      ? category.description.trim().slice(0, 160)
      : `Категория ${category?.name || ''} — Eichholtz Казахстан`,
    image: category?.image_url || displayCategory?.image_url,
    path: category ? categoryUrl(category) : undefined,
  })

  if (loading && !category) {
    return <p className="collection-page__status">Загрузка...</p>
  }

  if (error || !category) {
    return (
      <div className="collection-page collection-page--empty">
        <p className="collection-page__status">{error || 'Категория не найдена'}</p>
        <button type="button" className="link-underline" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    )
  }

  const isRootPage = category.parent_id == null

  return (
    <div className="collection-page">
      <Reveal className="collection-page__breadcrumb-wrap" variant="fade">
        <nav className="product-page__breadcrumb collection-page__breadcrumb" aria-label="Навигация">
          <Link to="/">Главная</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalog">Каталог</Link>
          <span aria-hidden="true">/</span>
          {rootCategory && !isRootPage && (
            <>
              <Link to={categoryUrl(rootCategory)}>{rootCategory.name}</Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          {parentCategory && rootCategory && parentCategory.id !== rootCategory.id && (
            <>
              <Link to={categoryUrl(parentCategory)}>{parentCategory.name}</Link>
              <span aria-hidden="true">/</span>
            </>
          )}
          <span>{category.name}</span>
        </nav>
      </Reveal>

      {/* Hero + subcategory chips only on catalog roots */}
      {isRootPage && (
        <>
          <Reveal className="collection-page__hero" variant="blur-up">
            {displayCategory?.image_url && (
              <div className="collection-page__hero-media">
                <img
                  src={displayCategory.image_url}
                  alt=""
                  onError={(e) => {
                    const media = e.currentTarget.closest('.collection-page__hero-media')
                    if (media) media.hidden = true
                  }}
                />
              </div>
            )}
            <div className="collection-page__hero-content">
              <h1 className="collection-page__title">{displayCategory?.name || category.name}</h1>

              <div
                className="collection-page__stats"
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.85rem',
                  color: 'var(--color-core-dark-grey)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {subcategories.length > 0 && (
                  <span>Подкатегорий: {subcategories.length}</span>
                )}
                {totalProducts > 0 && <span>Товаров: {totalProducts}</span>}
              </div>
              <div className="section-heading section-heading--left collection-page__divider" />

              {displayCategory?.description && (
                <p className="collection-page__description">{displayCategory.description}</p>
              )}
            </div>
          </Reveal>

          {subcategories.length > 0 && (
            <div className="collection-page__subcats">
              <button type="button" className="collection-page__subcat is-active">
                Все
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className="collection-page__subcat"
                  onClick={() => navigate(categoryUrl(sub))}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <ProductsCatalogSection
        categoryFilter={category.id}
        collectionFilterName={category.name}
        titleOverride={category.name}
        hideFilterChip
        onCartOpen={onCartOpen}
      />

      {otherCategories.length > 0 && (
        <section className="collection" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '3rem', fontWeight: 400 }}>
            Другие категории
          </h2>
          <Reveal as="div" className="category-grid reveal-stagger" variant="up" delay={120}>
            {otherCategories.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="category-tile"
                style={{ '--stagger': index }}
                onClick={() => navigate(categoryUrl(item))}
              >
                <img
                  src={item.image_url || '/logo.webp'}
                  alt=""
                  className={`category-tile__img ${!item.image_url ? 'img-fallback' : ''}`}
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = '/logo.webp'
                    e.currentTarget.classList.add('img-fallback')
                  }}
                />
                <span className="category-tile__name">{item.name}</span>
              </button>
            ))}
          </Reveal>
        </section>
      )}
    </div>
  )
}

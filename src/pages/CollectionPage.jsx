import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCollection, getCollections } from '../api/collections'
import { getProducts } from '../api/products'
import ProductsCatalogSection from '../sections/ProductsCatalogSection'
import Reveal from '../components/Reveal'
import { usePageMeta } from '../hooks/usePageMeta'
import { collectionUrl, collectionSlugPath } from '../utils/collectionUrl'
import { SITE_IMAGES } from '../data/siteImages'

export default function CollectionPage({ collectionId, onCartOpen }) {
  const { collectionSlug } = useParams()
  const navigate = useNavigate()
  const [collection, setCollection] = useState(null)
  const [collectionCatalogs, setCollectionCatalogs] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [collectionId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    getCollection(collectionId)
      .then((data) => {
        if (cancelled) return
        if (!data.published) {
          setError('Коллекция не найдена')
          setCollection(null)
          return
        }
        setCollection(data)
        
        const filterKey = data.kind === 'catalog' ? 'catalogId' : 'collectionId'
        getProducts({ [filterKey]: data.id })
          .then(prods => {
            if (!cancelled) setTotalProducts(prods.length)
          })
          .catch(() => {})

        if (data.kind === 'category') {
          getCollections({ published: true, kind: 'catalog' })
            .then(cats => {
              if (!cancelled) setCollectionCatalogs(cats.filter(c => c.parent_collection_id === data.id))
            })
            .catch(() => {})
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollection(null)
          setError('Коллекция не найдена')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [collectionId])

  useEffect(() => {
    if (!collection || !collectionSlug) return
    if (collection.id !== collectionId) return
    const expectedSlug = collectionSlugPath(collection)
    if (collectionSlug !== expectedSlug) {
      navigate(collectionUrl(collection), { replace: true })
    }
  }, [collection, collectionSlug, navigate])

  const isCollectionRelease = collection?.kind === 'catalog'
  const isCategory = collection?.kind === 'category'

  usePageMeta({
    enabled: !!collection,
    title: collection?.name,
    description: collection?.description?.trim()
      ? collection.description.trim().slice(0, 160)
      : isCollectionRelease
        ? `Коллекция ${collection?.name || ''} — Eichholtz Казахстан`
        : `Каталог ${collection?.name || ''} — Eichholtz Казахстан`,
    image: collection?.image_url,
    path: collection ? collectionUrl(collection) : undefined,
  })

  if (loading && !collection) {
    return <p className="collection-page__status">Загрузка...</p>
  }

  if (error || !collection) {
    return (
      <div className="collection-page collection-page--empty">
        <p className="collection-page__status">{error || 'Коллекция не найдена'}</p>
        <button type="button" className="link-underline" onClick={() => navigate('/')}>
          На главную
        </button>
      </div>
    )
  }

  return (
    <div className="collection-page">
      <Reveal className="collection-page__hero" variant="blur-up">
        <div className="collection-page__hero-media">
          <img 
            src={collection.image_url || '/logo.webp'} 
            alt="" 
            className={!collection.image_url ? 'img-fallback' : ''}
          />
        </div>
        <div className="collection-page__hero-content">
          {collection.season_name && (
            <p className="collection-page__season">{collection.season_name}</p>
          )}
          {collection.is_new && (
            <span style={{ background: 'var(--color-sec-metallic-gold)', color: 'var(--color-core-white)', fontSize: '0.8rem', padding: '4px 12px', borderRadius: '0', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: '0.5rem', display: 'inline-block' }}>Новинка</span>
          )}
          <h1 className="collection-page__title">
            {collection.name}
          </h1>
          
          <div className="collection-page__stats" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--color-core-dark-grey)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isCategory && collectionCatalogs.length > 0 && (
              <span>Каталогов: {collectionCatalogs.length}</span>
            )}
            {totalProducts > 0 && (
              <span>Товаров: {totalProducts}</span>
            )}
          </div>

          {collection.description && (
            <p className="collection-page__description">{collection.description}</p>
          )}
        </div>
      </Reveal>

      {isCategory && (
        <section className="catalogs" style={{ paddingTop: '4rem', paddingBottom: '2rem', borderTop: '1px solid var(--color-core-light-grey)' }}>
          <Reveal variant="blur-up">
            <h2 className="catalogs__title section-heading" style={{ marginBottom: '3rem' }}>Каталоги коллекции</h2>
          </Reveal>
          {collectionCatalogs.length > 0 ? (
            <div className="catalogs__grid">
              {collectionCatalogs.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className="catalog-card"
                  onClick={() => cat.pdf_url ? window.open(cat.pdf_url, '_blank') : null}
                >
                  <span className="catalog-card__media">
                    <img
                      src={cat.image_url || collection.image_url || '/logo.webp'}
                      alt=""
                      className={`catalog-card__img ${!(cat.image_url || collection.image_url) ? 'img-fallback' : ''}`}
                    />
                  </span>
                  <p className="catalog-card__title">{cat.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="catalogs__empty" style={{ textAlign: 'center', color: 'var(--color-core-dark-grey)' }}>
              У коллекции нет каталогов
            </p>
          )}
        </section>
      )}

      <ProductsCatalogSection
        collectionFilter={isCategory ? collection.id : undefined}
        catalogFilter={isCollectionRelease ? collection.id : undefined}
        collectionFilterName={collection.name}
        titleOverride={isCollectionRelease
          ? `Товары коллекции «${collection.name}»`
          : `Товары коллекции «${collection.name}»`}
        hideFilterChip
        onCartOpen={onCartOpen}
      />
    </div>
  )
}

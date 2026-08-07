import { useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getCollections } from '../api/collections'
import { getProducts } from '../api/products'
import { collectionUrl } from '../utils/collectionUrl'
import { productUrl } from '../utils/productUrl'

const PRODUCT_LIMIT = 8

export default function CatalogsNavPanel({ isOpen, onClose }) {
  const [categories, setCategories] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(null)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const hoverTimeoutRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    // Fetch catalogs (kind='catalog')
    getCollections({ published: true, kind: 'catalog' })
      .then((categoriesData) => {
        if (cancelled) return
        setCategories(categoriesData)
        setActiveCategoryId(categoriesData[0]?.id ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!activeCategoryId) {
      setProducts([])
      return
    }

    setProductsLoading(true)
    getProducts({ collection_id: activeCategoryId, published: true, limit: PRODUCT_LIMIT })
      .then((data) => {
        if (cancelled) return
        setProducts(data.products || [])
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeCategoryId])

  const activeCategory = useMemo(
    () => categories.find((item) => item.id === activeCategoryId) ?? null,
    [categories, activeCategoryId],
  )

  const visibleCategories = categories

  return (
    <div
      className={`header__collections-panel${isOpen ? ' header__collections-panel--open' : ''}`}
      id="catalogs-menu"
      aria-hidden={!isOpen}
    >
      <div className="header__collections-panel-inner">
        {loading ? (
          <p className="header__collections-empty">Загрузка...</p>
        ) : visibleCategories.length === 0 ? (
          <p className="header__collections-empty">Каталоги скоро появятся</p>
        ) : (
          <div className="header__collections-layout">
            
            {/* LEFT SIDE: Catalogs List */}
            <div className="header__collections-seasons">
              <p className="header__collections-heading">Каталоги</p>
              <ul className="header__collections-season-list">
                {visibleCategories.map((category) => (
                  <li key={category.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <button
                      type="button"
                      className={`header__collections-season-btn${activeCategoryId === category.id ? ' header__collections-season-btn--active' : ''}`}
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                        setActiveCategoryId(category.id)
                      }}
                      onFocus={() => setActiveCategoryId(category.id)}
                      onClick={() => setActiveCategoryId(current => current === category.id ? null : category.id)}
                      tabIndex={isOpen ? 0 : -1}
                    >
                      {category.name}
                    </button>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateRows: activeCategoryId === category.id ? '1fr' : '0fr',
                        transition: 'grid-template-rows 0.3s ease',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
                            <Link
                              to={collectionUrl(category)}
                              onClick={onClose}
                              tabIndex={isOpen && activeCategoryId === category.id ? 0 : -1}
                            >
                              <div className="mega-menu-preview-img" style={{ width: '100%', marginBottom: '0.5rem' }}>
                                <img 
                                  src={category.image_url || '/logo.webp'} 
                                  alt="" 
                                  className={!category.image_url ? 'img-fallback' : ''}
                                />
                              </div>
                            </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/catalogues"
                className="header__catalogs-all-link"
                onClick={onClose}
                tabIndex={isOpen ? 0 : -1}
                style={{ marginTop: '2rem' }}
              >
                Посмотреть все каталоги
              </Link>
            </div>

            {/* RIGHT SIDE: Products Grid */}
            <div className="header__catalogs-products-wrap">
              <div className="header__catalogs-products-head">
                <p className="header__collections-heading">Товары</p>
                {activeCategory && (
                  <Link
                    to={collectionUrl(activeCategory)}
                    className="header__catalogs-page-link"
                    onClick={onClose}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {activeCategory.name}
                  </Link>
                )}
              </div>

              {productsLoading ? (
                <p className="header__collections-empty">Загрузка товаров...</p>
              ) : products.length === 0 ? (
                <p className="header__collections-empty">В этом каталоге пока нет товаров</p>
              ) : (
                <>
                  <ul className="header__catalogs-products">
                    {products.map((product) => (
                      <li key={product.id}>
                        <Link
                          to={productUrl(product)}
                          className="header__catalogs-product"
                          onClick={onClose}
                          tabIndex={isOpen ? 0 : -1}
                        >
                          {product.image_url ? (
                            <img src={product.image_url} alt="" className="header__catalogs-product-img" />
                          ) : (
                            <img src="/logo.webp" alt="" className="header__catalogs-product-img img-fallback" />
                          )}
                          <span className="header__catalogs-product-name">{product.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {activeCategory && (
                    <Link
                      to={collectionUrl(activeCategory)}
                      className="header__catalogs-more-link"
                      onClick={onClose}
                      tabIndex={isOpen ? 0 : -1}
                    >
                      Все товары каталога
                    </Link>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

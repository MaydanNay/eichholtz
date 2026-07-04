import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts } from '../api/products'
import { getCategories } from '../api/categories'
import { categoryUrl } from '../utils/categoryUrl'
import CustomSelect from '../components/CustomSelect'
import PriceInquiryModal from '../components/PriceInquiryModal'
import FavoriteButton from '../components/FavoriteButton'
import AddToCartButton from '../components/AddToCartButton'
import Reveal from '../components/Reveal'
import { productUrl } from '../utils/productUrl'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 8

const SORT_OPTIONS = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'name_asc', label: 'Название: А—Я' },
  { value: 'name_desc', label: 'Название: Я—А' },
  { value: 'newest', label: 'Сперва новые' },
  { value: 'oldest', label: 'Сперва старые' },
]

export default function ProductsCatalogSection({
  collectionFilter,
  catalogFilter,
  categoryFilter,
  collectionFilterName,
  searchQuery,
  titleOverride,
  hideFilterChip = false,
  onClearCollectionFilter,
  onClearSearchQuery,
  onCartOpen,
  sidebarNavigates = false,
  hideSidebar = false,
}) {
  const [products, setProducts] = useState([])
  const [categoriesList, setCategoriesList] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalProduct, setModalProduct] = useState(null)
  const [sortValue, setSortValue] = useState('default')
  const [localCategoryFilters, setLocalCategoryFilters] = useState(categoryFilter ? [categoryFilter] : [])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const categoriesTree = useMemo(() => {
    const map = new Map()
    const roots = []
    
    categoriesList.forEach(c => map.set(c.id, { ...c, children: [] }))

    map.forEach(c => {
      if (c.parent_id && map.has(c.parent_id)) {
        map.get(c.parent_id).children.push(c)
      } else {
        roots.push(c)
      }
    })

    return roots
  }, [categoriesList])

  const toggleCategory = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Auto-expand parents if a child is selected
  useEffect(() => {
    if (localCategoryFilters.length === 0) return
    const newExpanded = { ...expandedCategories }
    let changed = false
    
    // Find parent chain
    const findChain = (id) => {
      const c = categoriesList.find(cat => cat.id === id)
      if (c && c.parent_id) {
        if (!newExpanded[c.parent_id]) {
          newExpanded[c.parent_id] = true
          changed = true
        }
        findChain(c.parent_id)
      }
    }
    localCategoryFilters.forEach(id => findChain(id))
    
    if (changed) setExpandedCategories(newExpanded)
  }, [localCategoryFilters, categoriesList]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderCategory = (c, level = 0) => {
    const hasChildren = c.children && c.children.length > 0
    const isExpanded = !!expandedCategories[c.id]
    const isActive = localCategoryFilters.includes(c.id)
    
    const handleCategoryClick = (e) => {
      if (sidebarNavigates) return
      setLocalCategoryFilters(prev => {
        if (prev.includes(c.id)) {
          return prev.filter(id => id !== c.id)
        }
        return [...prev, c.id]
      })
    }
    
    return (
      <li key={c.id}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: level > 0 ? `${level * 1}rem` : undefined }}>
          {sidebarNavigates ? (
            <Link
              to={categoryUrl(c)}
              className={`products-catalog__sidebar-link ${isActive ? 'active' : ''}`}
              style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.6rem' }}
            >
              <div 
                style={{ 
                  width: 16, height: 16, 
                  border: `1px solid ${isActive ? 'var(--color-black)' : 'var(--color-gray-text)'}`, 
                  borderRadius: 2, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--color-black)' : 'transparent',
                  flexShrink: 0
                }}
              >
                {isActive && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              {c.name}
            </Link>
          ) : (
            <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={handleCategoryClick}
                style={{ 
                  width: 16, height: 16, 
                  border: `1px solid ${isActive ? 'var(--color-black)' : 'var(--color-gray-text)'}`, 
                  borderRadius: 2, 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--color-black)' : 'transparent',
                  flexShrink: 0,
                  padding: 0,
                  cursor: 'pointer'
                }}
              >
                {isActive && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <button
                type="button"
                className={`products-catalog__sidebar-link ${isActive ? 'active' : ''}`}
                onClick={(e) => hasChildren ? toggleCategory(c.id, e) : handleCategoryClick(e)}
                style={{ flexGrow: 1, textAlign: 'left', padding: 0 }}
              >
                {c.name}
              </button>
            </div>
          )}
          {hasChildren && (
            <button
              type="button"
              className="products-catalog__sidebar-toggle"
              onClick={(e) => toggleCategory(c.id, e)}
              aria-label="Свернуть/развернуть"
              style={{ marginLeft: '1rem' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'inherit' }}>
                <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
        {hasChildren && isExpanded && (
          <ul className="products-catalog__sidebar-sublist">
            {c.children.map(child => renderCategory(child, level + 1))}
          </ul>
        )}
      </li>
    )
  }

  useEffect(() => {
    setLocalCategoryFilters(categoryFilter ? [categoryFilter] : [])
  }, [categoryFilter])

  useEffect(() => {
    let cancelled = false
    getCategories(true, collectionFilter || catalogFilter || undefined)
      .then((data) => {
        if (!cancelled) setCategoriesList(data)
      })
      .catch(() => {
        if (!cancelled) setCategoriesList([])
      })
    return () => {
      cancelled = true
    }
  }, [collectionFilter, catalogFilter])

  useEffect(() => {
    setLoading(true)
    setCurrentPage(1)
    getProducts({
      collectionId: collectionFilter || undefined,
      catalogId: catalogFilter || undefined,
      categoryId: localCategoryFilters.length > 0 ? localCategoryFilters.join(',') : undefined,
      q: searchQuery || undefined,
      limit: searchQuery ? 100 : undefined,
    })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [collectionFilter, catalogFilter, localCategoryFilters, searchQuery])

  let sortedProducts = [...products]
  if (sortValue === 'price_asc') {
    sortedProducts.sort((a, b) => (a.price || 0) - (b.price || 0))
  } else if (sortValue === 'price_desc') {
    sortedProducts.sort((a, b) => (b.price || 0) - (a.price || 0))
  } else if (sortValue === 'name_asc') {
    sortedProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  } else if (sortValue === 'name_desc') {
    sortedProducts.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
  } else if (sortValue === 'newest') {
    sortedProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : a.id
      const dateB = b.created_at ? new Date(b.created_at).getTime() : b.id
      return dateB - dateA
    })
  } else if (sortValue === 'oldest') {
    sortedProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : a.id
      const dateB = b.created_at ? new Date(b.created_at).getTime() : b.id
      return dateA - dateB
    })
  }

  const totalPages = Math.ceil(sortedProducts.length / PAGE_SIZE)
  const shown = sortedProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasSearch = !!searchQuery?.trim()

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }

    return (
      <Reveal variant="fade" delay={200}>
        <div className="products-catalog__pagination">
          {pages.map((p, index) =>
            p === '...' ? (
              <span key={`ellipsis-${index}`} className="products-catalog__page-ellipsis">...</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`products-catalog__page-btn ${currentPage === p ? 'active' : ''}`}
                onClick={() => {
                  setCurrentPage(p)
                  document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {p}
              </button>
            )
          )}
        </div>
      </Reveal>
    )
  }

  return (
    <>
      <section className="products-catalog" id="products">
        <Reveal className="products-catalog__header" variant="blur-up">
          <h2 className="products-catalog__title section-heading">
            {titleOverride || (hasSearch ? 'Результаты поиска' : 'Каталог товаров')}
          </h2>
          {hasSearch && (
            <div className="products-catalog__filter">
              <span>Поиск: «{searchQuery}»</span>
              <button
                type="button"
                className="products-catalog__filter-clear"
                onClick={onClearSearchQuery}
              >
                Сбросить
              </button>
            </div>
          )}
          {!hasSearch && (collectionFilter || catalogFilter || localCategoryFilters.length > 0) && !hideFilterChip && (
            <div className="products-catalog__filter">
              <span>
                {localCategoryFilters.length > 0 ? 'Категория' : catalogFilter ? 'Каталог' : 'Коллекция'}: {localCategoryFilters.length > 0 ? localCategoryFilters.map(id => categoriesList.find(c => c.id === id)?.name).filter(Boolean).join(', ') : collectionFilterName}
              </span>
              {localCategoryFilters.length > 0 && localCategoryFilters.length === 1 && categoriesList.find(c => c.id === localCategoryFilters[0]) ? (
                <Link
                  to={categoryUrl(categoriesList.find(c => c.id === localCategoryFilters[0]))}
                  className="products-catalog__filter-clear"
                  style={{ textDecoration: 'underline' }}
                >
                  Перейти на страницу категории
                </Link>
              ) : (
                <button
                  type="button"
                  className="products-catalog__filter-clear"
                  onClick={() => {
                    setLocalCategoryFilters([])
                    if (onClearCollectionFilter) onClearCollectionFilter()
                  }}
                >
                  Показать все
                </button>
              )}
            </div>
          )}
        </Reveal>

        <div className="products-catalog__layout">
          {!hideSidebar && (
            <>
              <button 
                type="button" 
                className="products-catalog__mobile-toggle"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              >
                {mobileSidebarOpen ? 'Скрыть категории' : 'Фильтр категорий'}
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '0.5rem', transform: mobileSidebarOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <aside className={`products-catalog__sidebar ${mobileSidebarOpen ? 'open' : ''}`}>
                {mobileSidebarOpen && (
                  <div className="products-catalog__sidebar-header-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-serif)' }}>Фильтр</h3>
                    <button 
                      type="button" 
                      onClick={() => setMobileSidebarOpen(false)}
                      style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.5rem' }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <CustomSelect
                value={sortValue}
                options={SORT_OPTIONS}
                onChange={setSortValue}
              />
              <ul className="products-catalog__sidebar-list">
                <li>
                  {sidebarNavigates ? (
                    <Link
                      to="/"
                      state={{ scrollTo: 'products', menuTs: Date.now() }}
                      className={`products-catalog__sidebar-link ${localCategoryFilters.length === 0 && !collectionFilter && !catalogFilter ? 'active' : ''}`}
                    >
                      Все
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`products-catalog__sidebar-link ${localCategoryFilters.length === 0 && !collectionFilter && !catalogFilter ? 'active' : ''}`}
                      onClick={() => {
                        setLocalCategoryFilters([])
                        if (onClearCollectionFilter) onClearCollectionFilter()
                      }}
                    >
                      Все
                    </button>
                  )}
                </li>
                {categoriesTree.map((c) => renderCategory(c))}
              </ul>
            </aside>
            </>
          )}

          <div className="products-catalog__main" style={hideSidebar ? { paddingLeft: 0, marginTop: '2rem' } : undefined}>
            {hideSidebar && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                <div style={{ width: '220px' }}>
                  <CustomSelect
                    value={sortValue}
                    options={SORT_OPTIONS}
                    onChange={setSortValue}
                  />
                </div>
              </div>
            )}
            {loading ? (
              <p className="products-catalog__empty">Загрузка...</p>
            ) : products.length === 0 ? (
              <p className="products-catalog__empty">
                {hasSearch
                  ? 'По вашему запросу ничего не найдено'
                  : (collectionFilter || catalogFilter || localCategoryFilters.length > 0)
                    ? 'В этой подборке пока нет товаров'
                    : 'Товары не загружены'}
              </p>
            ) : (
              <>
                <Reveal
                  key={`${collectionFilter || 'all'}-${catalogFilter || 'all'}-${localCategoryFilters.join(',') || 'all'}-${searchQuery || ''}-${sortValue}-${currentPage}`}
                  className="products-catalog__grid reveal-stagger"
                  variant="up"
                  delay={80}
                >
                  {shown.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      style={{ '--stagger': index % PAGE_SIZE }}
                      onCartOpen={onCartOpen}
                      onPriceInquiry={(p) => setModalProduct(p)}
                    />
                  ))}
                </Reveal>

                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </section>

      <PriceInquiryModal
        isOpen={!!modalProduct}
        product={modalProduct}
        onClose={() => setModalProduct(null)}
      />
    </>
  )
}

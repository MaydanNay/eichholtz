import { useEffect, useState, useMemo, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getProducts } from '../api/products'
import { getCategories } from '../api/categories'
import { getHomeSettings } from '../api/homeSettings'
import { categoryUrl } from '../utils/categoryUrl'
import CustomSelect from '../components/CustomSelect'
import FavoriteButton from '../components/FavoriteButton'
import AddToCartButton from '../components/AddToCartButton'
import Reveal from '../components/Reveal'
import { productUrl } from '../utils/productUrl'
import ProductCard from '../components/ProductCard'
import { SPEC_LABELS, translateSpecValue, getSpecLabel } from '../utils/specLabels'

const PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'newest', label: 'Сперва новые' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
]

const EXCLUDED_SPECS = [
  'variation',
  'height',
  'diameter',
  'width',
  'depth',
  'weight',
  'sku',
  'objectid',
  'extra_collections',
  'also_available_skus',
  'categories_without_path',
  'dimensions',
  'extra_categories',
  'specifications',
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
  hideSidebar = false,
}) {
  const [products, setProducts] = useState([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [categoriesList, setCategoriesList] = useState([])
  const [filterColors, setFilterColors] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [sortValue, setSortValue] = useState('newest')
  const [localCategoryFilters, setLocalCategoryFilters] = useState(categoryFilter ? [categoryFilter] : [])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [expandedSpecs, setExpandedSpecs] = useState({})
  const [selectedSpecs, setSelectedSpecs] = useState({}) // { [key]: [value1, value2] }
  const [availableSpecs, setAvailableSpecs] = useState([])
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
    
    const handleCategoryClick = () => {
      setLocalCategoryFilters((prev) => {
        if (prev.includes(c.id)) {
          return prev.filter((id) => id !== c.id)
        }
        return [...prev, c.id]
      })
    }

    const handleNameClick = (e) => {
      e.preventDefault()
      if (hasChildren) toggleCategory(c.id, e)
    }
    
    return (
      <li key={c.id}>
        <div
          className="products-catalog__spec-label"
          style={{ flexGrow: 1, margin: 0, padding: 0, paddingLeft: level > 0 ? `${level * 1}rem` : undefined, cursor: 'default' }}
        >
          <label className="products-catalog__spec-check" title="Выбрать категорию">
            <input 
              type="checkbox" 
              className="products-catalog__spec-checkbox-input"
              checked={isActive || false}
              onChange={handleCategoryClick}
            />
            <span className="products-catalog__spec-checkbox-custom">
              {isActive && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
          </label>
          <button
            type="button"
            className={`products-catalog__spec-value-name ${isActive ? 'active' : ''}${hasChildren ? ' products-catalog__spec-value-name--toggle' : ''}`}
            onClick={handleNameClick}
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {c.name}
          </button>
          {hasChildren && (
            <button
              type="button"
              className="products-catalog__sidebar-toggle"
              onClick={(e) => { e.preventDefault(); toggleCategory(c.id, e); }}
              aria-label="Свернуть/развернуть"
              style={{ padding: 0, marginLeft: 'auto' }}
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
    let cancelled = false
    getHomeSettings()
      .then((data) => {
        if (!cancelled && data.product_attributes) {
          try {
            const attrs = JSON.parse(data.product_attributes)
            const map = {}
            Object.values(attrs).forEach(attr => {
              if (attr.options) {
                attr.options.forEach(opt => {
                  if (opt.swatch) map[opt.value] = opt.swatch
                })
              }
            })
            setFilterColors(map)
          } catch (e) {
            setFilterColors({})
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const categoryIds =
      localCategoryFilters.length > 0
        ? localCategoryFilters
        : categoryFilter != null
          ? [categoryFilter]
          : []
    // Facets are heavy — refresh when filters change, not on every page flip.
    const wantFacets = currentPage === 1
    getProducts({
      collectionId: collectionFilter || undefined,
      catalogId: catalogFilter || undefined,
      categoryId: categoryIds.length > 0 ? categoryIds.join(',') : undefined,
      q: searchQuery || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
      sort: sortValue,
      specs: Object.keys(selectedSpecs).length > 0 ? selectedSpecs : undefined,
      includeFacets: wantFacets,
    })
      .then((data) => {
        if (cancelled) return
        setProducts(data.items || [])
        setTotalProducts(data.total || 0)
        if (data.facets) {
          const specsList = Object.entries(data.facets)
            .filter(([key]) => {
              if (EXCLUDED_SPECS.includes(key)) return false
              if (!SPEC_LABELS[key] && /[_-]/.test(key)) return false
              return true
            })
            .map(([key, values]) => ({
              label: getSpecLabel(key),
              originalKey: key,
              values: values || {},
            }))
            .sort((a, b) => a.label.localeCompare(b.label))
          setAvailableSpecs(specsList)
        }
      })
      .catch(() => {
        if (cancelled) return
        setProducts([])
        setTotalProducts(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [collectionFilter, catalogFilter, categoryFilter, localCategoryFilters, searchQuery, currentPage, sortValue, selectedSpecs])

  // Clear spec filters when category or collection changes
  useEffect(() => {
    setSelectedSpecs({})
    setCurrentPage(1)
  }, [collectionFilter, catalogFilter, localCategoryFilters])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const toggleSpecValue = (specKey, value) => {
    setSelectedSpecs(prev => {
      const current = prev[specKey] || []
      if (current.includes(value)) {
        const next = current.filter(v => v !== value)
        if (next.length === 0) {
          const { [specKey]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [specKey]: next }
      }
      return { ...prev, [specKey]: [...current, value] }
    })
    setCurrentPage(1)
  }

  const toggleSpecSection = (specKey) => {
    setExpandedSpecs(prev => ({ ...prev, [specKey]: !prev[specKey] }))
  }

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE)
  const shown = products
  const hasSearch = !!searchQuery?.trim()
  const rangeFrom = totalProducts === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeTo = Math.min(currentPage * PAGE_SIZE, totalProducts)
  const countLabel =
    totalProducts === 0
      ? '0 товаров'
      : `Товары ${rangeFrom}–${rangeTo} из ${totalProducts.toLocaleString('ru-RU')}`

  const renderSortSelect = () => (
    <div className="products-catalog__sort">
      <CustomSelect
        value={sortValue}
        options={SORT_OPTIONS}
        onChange={(value) => {
          setSortValue(value)
          setCurrentPage(1)
        }}
      />
    </div>
  )

  const renderToolbar = () => (
    <div className="products-catalog__toolbar">
      <p className="products-catalog__count">{loading ? 'Загрузка...' : countLabel}</p>
      {renderSortSelect()}
    </div>
  )

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 3 && i <= currentPage + 3) ||
        (currentPage <= 4 && i <= 7) ||
        (currentPage >= totalPages - 3 && i >= totalPages - 6)
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
                Фильтры
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
              <div className="products-catalog__sidebar-specs" style={{ marginTop: 0 }}>
                <div className="products-catalog__spec-group">
                  <button
                    type="button"
                    className="products-catalog__spec-header"
                    onClick={() => setExpandedSpecs(prev => ({ ...prev, '_categories': !prev['_categories'] }))}
                  >
                    <span className="products-catalog__spec-title">
                      Категории
                    </span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: expandedSpecs['_categories'] ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'inherit' }}>
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {expandedSpecs['_categories'] && (
                    <ul className="products-catalog__sidebar-list" style={{ marginTop: 0 }}>
                      <li>
                          <button
                            type="button"
                            className={`products-catalog__sidebar-link ${localCategoryFilters.length === 0 ? 'active' : ''}`}
                            onClick={() => {
                              setLocalCategoryFilters([])
                              if (onClearCollectionFilter) onClearCollectionFilter()
                            }}
                          >
                            Все
                          </button>
                      </li>
                      {categoriesTree.map((c) => renderCategory(c))}
                    </ul>
                  )}
                </div>
                
                {availableSpecs.length > 0 && availableSpecs.map(spec => {
                    const isExpanded = !!expandedSpecs[spec.originalKey] // Default closed
                    const selectedCount = selectedSpecs[spec.originalKey]?.length || 0
                    
                    return (
                      <div key={spec.originalKey} className="products-catalog__spec-group">
                        <button
                          type="button"
                          className="products-catalog__spec-header"
                          onClick={() => toggleSpecSection(spec.originalKey)}
                        >
                          <span className="products-catalog__spec-title">
                            {spec.label}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'inherit' }}>
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        
                        {isExpanded && (
                          <div className="products-catalog__spec-values">
                            {Object.entries(spec.values)
                              .sort((a, b) => translateSpecValue(a[0]).localeCompare(translateSpecValue(b[0])))
                              .map(([value, count]) => {
                              const isSelected = selectedSpecs[spec.originalKey]?.includes(value)
                              let swatchBg = null
                              const exactMatch = filterColors[value]
                              
                                if (exactMatch) {
                                  if (exactMatch.startsWith('http') || exactMatch.startsWith('/')) {
                                    swatchBg = `url(${exactMatch}) center/cover no-repeat` 
                                  } else if (exactMatch.includes(',')) {
                                    const colors = exactMatch.split(',').map(c => c.trim())
                                    if (colors.length === 2) {
                                      swatchBg = `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
                                    } else if (colors.length >= 3) {
                                      swatchBg = `linear-gradient(135deg, ${colors[0]} 33%, ${colors[1]} 33% 66%, ${colors[2]} 66%)`
                                    } else {
                                      swatchBg = colors[0]
                                    }
                                  } else {
                                    swatchBg = exactMatch
                                  }
                                } else {
                                  // Try parsing multiple colors (e.g. "Beige , Sand", "Brown,Natural")
                                  const parts = value.split(/[,|]/).map(p => p.trim())
                                  if (parts.length > 1 && parts.some(p => filterColors[p])) {
                                    const colors = parts.map(p => filterColors[p] || 'var(--color-ui-bg-light)')
                                    if (colors.length === 2) {
                                      swatchBg = `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`
                                    } else if (colors.length === 3) {
                                      swatchBg = `linear-gradient(135deg, ${colors[0]} 33%, ${colors[1]} 33% 66%, ${colors[2]} 66%)`
                                    } else {
                                      swatchBg = colors[0]
                                    }
                                  }
                                }
                              
                              return (
                                <label key={value} className={`products-catalog__spec-label${swatchBg ? ' products-catalog__spec-label--swatch' : ''}`}>
                                  <input 
                                    type="checkbox" 
                                    className="products-catalog__spec-checkbox-input"
                                    checked={isSelected || false}
                                    onChange={() => toggleSpecValue(spec.originalKey, value)}
                                  />
                                  {!swatchBg && (
                                    <span className="products-catalog__spec-checkbox-custom">
                                      {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                    </span>
                                  )}
                                  {swatchBg && (
                                    <span
                                      className={`products-catalog__spec-swatch${isSelected ? ' is-selected' : ''}`}
                                      style={{ background: swatchBg }}
                                    >
                                      {isSelected && (
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                          <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      )}
                                    </span>
                                  )}
                                  <span className="products-catalog__spec-value-name">{translateSpecValue(value)}</span>
                                  <span className="products-catalog__spec-value-count">({count})</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            </aside>
            </>
          )}

          <div className="products-catalog__main" style={hideSidebar ? { paddingLeft: 0, marginTop: '2rem' } : undefined}>
            {renderToolbar()}
            {loading ? (
              <p className="products-catalog__empty">Загрузка...</p>
            ) : shown.length === 0 ? (
              <p className="products-catalog__empty">
                {hasSearch
                  ? 'По вашему запросу ничего не найдено'
                  : (collectionFilter || catalogFilter || localCategoryFilters.length > 0 || Object.keys(selectedSpecs).length > 0)
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
                    />
                  ))}
                </Reveal>

                {renderPagination()}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

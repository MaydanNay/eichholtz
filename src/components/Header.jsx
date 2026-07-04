import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import CatalogMenu from './CatalogMenu'
import CatalogsNavPanel from './CatalogsNavPanel'
import CollectionsNavPanel from './CollectionsNavPanel'
import { searchProducts } from '../api/products'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { useCart } from '../context/CartContext'
import { productUrl } from '../utils/productUrl'

const NAV_ITEMS = [
  { id: 'home', label: 'Главная' },
  { id: 'collections', label: 'Коллекции', megaMenu: 'collections' },
  { id: 'catalogs', label: 'Каталоги', megaMenu: 'catalogs' },
  { id: 'designers', label: 'Дизайнерам' },
  { id: 'events', label: 'Мероприятия' },
  { id: 'about', label: 'О компании' },
  { id: 'contacts', label: 'Контакты', accent: true },
]

function IconAccount() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" role="img" aria-hidden="true">
      <path
        fill="currentColor"
        d="M240.924-268.307q51-37.846 111.115-59.769Q412.154-349.999 480-349.999t127.961 21.923q60.115 21.923 111.115 59.769 37.308-41 59.116-94.923Q800-417.154 800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 62.846 21.808 116.77 21.808 53.923 59.116 94.923Zm239.088-181.694q-54.781 0-92.396-37.603-37.615-37.604-37.615-92.384 0-54.781 37.603-92.396 37.604-37.615 92.384-37.615 54.781 0 92.396 37.603 37.615 37.604 37.615 92.384 0 54.781-37.603 92.396-37.604 37.615-92.384 37.615Zm-.012 350q-79.154 0-148.499-29.77-69.346-29.769-120.654-81.076-51.307-51.308-81.076-120.654-29.77-69.345-29.77-148.499t29.77-148.499q29.769-69.346 81.076-120.654 51.308-51.307 120.654-81.076 69.345-29.77 148.499-29.77t148.499 29.77q69.346 29.769 120.654 81.076 51.307 51.308 81.076 120.654 29.77 69.345 29.77 148.499t-29.77 148.499q-29.769 69.346-81.076 120.654-51.308 51.307-120.654 81.076-69.345 29.77-148.499 29.77ZM480-160q54.154 0 104.423-17.423 50.27-17.423 89.27-48.731-39-30.154-88.116-47Q536.462-290.001 480-290.001q-56.462 0-105.77 16.654-49.308 16.654-87.923 47.193 39 31.308 89.27 48.731Q425.846-160 480-160Zm0-349.999q29.846 0 49.924-20.077 20.077-20.078 20.077-49.924t-20.077-49.924Q509.846-650.001 480-650.001t-49.924 20.077Q409.999-609.846 409.999-580t20.077 49.924q20.078 20.077 49.924 20.077ZM480-580Zm0 355Z"
      />
    </svg>
  )
}

function IconWishlist() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" role="img" aria-hidden="true">
      <path
        fill="currentColor"
        d="m480-146.925-44.153-39.691q-99.461-90.231-164.5-155.077-65.038-64.846-103.076-115.423-38.039-50.577-53.154-92.269-15.116-41.692-15.116-84.615 0-85.153 57.423-142.576Q214.847-833.999 300-833.999q52.385 0 99 24.501 46.615 24.5 81 70.269 34.385-45.769 81-70.269 46.615-24.501 99-24.501 85.153 0 142.576 57.423Q859.999-719.153 859.999-634q0 42.923-15.116 84.615-15.115 41.692-53.154 92.269-38.038 50.577-102.884 115.423T524.153-186.616L480-146.925ZM480-228q96-86.385 158-148.077 62-61.692 98-107.192 36-45.5 50-80.808 14-35.308 14-69.923 0-60-40-100t-100-40q-47.385 0-87.577 26.885-40.192 26.884-63.654 74.808h-57.538q-23.846-48.308-63.846-75.001Q347.385-774 300-774q-59.615 0-99.808 40Q160-694 160-634q0 34.615 14 69.923t50 80.808q36 45.5 98 107T480-228Zm0-273Z"
      />
    </svg>
  )
}

function IconCart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" role="img" aria-hidden="true">
      <path
        fill="currentColor"
        d="M286.154-97.694q-29.153 0-49.576-20.422-20.423-20.423-20.423-49.577 0-29.153 20.423-49.576 20.423-20.423 49.576-20.423 29.154 0 49.577 20.423t20.423 49.576q0 29.154-20.423 49.577-20.423 20.422-49.577 20.422Zm387.692 0q-29.154 0-49.577-20.422-20.423-20.423-20.423-49.577 0-29.153 20.423-49.576 20.423-20.423 49.577-20.423 29.153 0 49.576 20.423 20.423 20.423 20.423 49.576 0 29.154-20.423 49.577-20.423 20.422-49.576 20.422ZM240.615-730 342-517.692h272.692q3.462 0 6.154-1.731 2.693-1.731 4.616-4.808l107.307-195q2.308-4.231.385-7.5-1.923-3.27-6.539-3.27h-486Zm-28.769-59.998h555.383q24.538 0 37.115 20.884 12.577 20.885 1.192 42.654L677.384-494.309q-9.847 17.308-26.039 26.962-16.192 9.653-35.499 9.653H324l-46.308 84.616q-3.077 4.616-.192 10.001t8.654 5.385h457.691v59.998H286.154q-39.999 0-60.115-34.499-20.115-34.5-1.423-68.884l57.078-102.616-145.539-306.308H60.001v-59.998h113.845l38 80ZM342-517.692h280-280Z"
      />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <rect x="0" y="0" width="6" height="6" />
      <rect x="8" y="0" width="6" height="6" />
      <rect x="0" y="8" width="6" height="6" />
      <rect x="8" y="8" width="6" height="6" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M1 1l12 12M13 1L1 13" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg
      className="header__nav-chevron"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 3.5L5 7L8.5 3.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Header({
  activePage,
  onNavigate,
  onSearch,
  onCartOpen,
  onFavoritesOpen,
  onAccountOpen,
  isCatalogOpen,
  onCatalogToggle,
  onCatalogItemClick,
}) {
  const [scrolled, setScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [openMegaMenu, setOpenMegaMenu] = useState(null)
  const { isAuthenticated } = useAuth()
  const { count: favoritesCount } = useFavorites()
  const { count: cartCount } = useCart()
  const headerRef = useRef(null)
  const searchRef = useRef(null)
  const searchInputRef = useRef(null)
  const location = useLocation()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [isHidden, setIsHidden] = useState(false)
  const lastScrollYRef = useRef(0)
  const isSearchOpenRef = useRef(false)

  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen
  }, [isSearchOpen])

  useEffect(() => {
    setOpenMegaMenu(null)
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => {
      const currentScrollY = window.scrollY
      setScrolled(currentScrollY > 24)

      // Hide header when scrolling down past 150px, show when scrolling up
      if (currentScrollY > 150 && currentScrollY > lastScrollYRef.current) {
        if (!isSearchOpenRef.current) {
          setIsHidden(true)
          setOpenMegaMenu(null)
        }
      } else if (currentScrollY < lastScrollYRef.current) {
        setIsHidden(false)
      }
      
      lastScrollYRef.current = currentScrollY
    }
    
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen) return undefined

    const query = searchQuery.trim()
    if (query.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return undefined
    }

    let cancelled = false
    setSearchLoading(true)

    const timer = window.setTimeout(() => {
      searchProducts(query, 8)
        .then((items) => {
          if (!cancelled) setSearchResults(items)
        })
        .catch(() => {
          if (!cancelled) setSearchResults([])
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [searchQuery, isSearchOpen])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setIsSearchOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false)
        searchInputRef.current?.blur()
        closeMegaMenu()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!isCatalogOpen) return undefined
    setOpenMegaMenu(null)

    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMegaMenu(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isCatalogOpen, onCatalogToggle])

  useEffect(() => {
    if (!openMegaMenu) return undefined

    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMegaMenu(null)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMegaMenu(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMegaMenu])

  const submitSearch = (query) => {
    const trimmed = query.trim()
    if (!trimmed) return
    onSearch?.(trimmed)
    setIsSearchOpen(false)
  }

  const openMegaMenuPanel = (menu) => {
    setOpenMegaMenu(menu)
  }

  const closeMegaMenu = () => {
    setOpenMegaMenu(null)
  }

  const isCollectionsOpen = openMegaMenu === 'collections'
  const isCatalogsMegaOpen = openMegaMenu === 'catalogs'

  const showSearchDropdown = isSearchOpen && searchQuery.trim().length >= 2

  return (
    <>
      <header
        ref={headerRef}
        className={`header${scrolled ? ' header--scrolled' : ''}${isCatalogOpen ? ' header--catalog-open' : ''}${openMegaMenu ? ' header--collections-open' : ''}${isHidden ? ' header--hidden' : ''}`}
        onMouseLeave={closeMegaMenu}
      >
      <div className="header__top">
        <div className="header__top-left">
          <div
            ref={searchRef}
            className={`header__search-wrap${isSearchOpen ? ' header__search-wrap--open' : ''}`}
          >
            <form
            className={`header__search${isSearchOpen ? ' header__search--open' : ''}`}
            onSubmit={(e) => {
              e.preventDefault()
              submitSearch(searchQuery)
            }}
          >
            <button
              type={isSearchOpen ? 'submit' : 'button'}
              className="header__search-btn"
              aria-label={isSearchOpen ? 'Найти' : 'Открыть поиск'}
              aria-expanded={isSearchOpen}
              onClick={!isSearchOpen ? () => setIsSearchOpen(true) : undefined}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
            </button>
            <input
              ref={searchInputRef}
              type="search"
              name="query"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по сайту"
              className="header__search-input"
              autoComplete="off"
              aria-expanded={showSearchDropdown}
              aria-controls="header-search-results"
            />
          </form>
          <span className="header__search-hint">Найдите что вам нужно</span>
          {showSearchDropdown && (
            <div className="header__search-dropdown" id="header-search-results" role="listbox">
              {searchLoading ? (
                <p className="header__search-dropdown-empty">Поиск...</p>
              ) : searchResults.length === 0 ? (
                <p className="header__search-dropdown-empty">Ничего не найдено</p>
              ) : (
                <ul className="header__search-dropdown-list">
                  {searchResults.map((product) => (
                    <li key={product.id}>
                      <Link
                        to={productUrl(product)}
                        className="header__search-dropdown-item"
                        onClick={() => setIsSearchOpen(false)}
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="header__search-dropdown-img" />
                        ) : (
                          <span className="header__search-dropdown-placeholder" />
                        )}
                        <span className="header__search-dropdown-text">
                          <span className="header__search-dropdown-name">{product.name}</span>
                          {product.collection_name && (
                            <span className="header__search-dropdown-meta">{product.collection_name}</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="header__search-dropdown-all"
                onClick={() => submitSearch(searchQuery)}
              >
                Показать все результаты
              </button>
            </div>
          )}
        </div>
          <div className="header__actions header__actions--mobile">
            <button
              type="button"
              className="header__action"
              aria-label="Профиль"
              onClick={() => {
                if (isAuthenticated) {
                  onNavigate('account')
                } else {
                  onAccountOpen('login')
                }
              }}
            >
              <IconAccount />
            </button>
            <button
              type="button"
              className="header__action header__action--favorites"
              aria-label="Избранное"
              onClick={onFavoritesOpen}
            >
              <IconWishlist />
              {favoritesCount > 0 && (
                <span className="header__badge" aria-hidden="true">{favoritesCount}</span>
              )}
            </button>
            <button
              type="button"
              className="header__action header__action--cart"
              aria-label="Корзина"
              onClick={onCartOpen}
            >
              <IconCart />
              {cartCount > 0 && (
                <span className="header__badge" aria-hidden="true">{cartCount}</span>
              )}
            </button>
          </div>
      </div>

        <button
          type="button"
          className="header__logo"
          onClick={() => onNavigate('home')}
          aria-label="На главную"
        >
          <img src="/logo.webp" alt="Eichholtz" className="header__logo-img" />
        </button>

        <div className="header__top-right">
          <button
            type="button"
            className="header__hamburger"
            aria-label="Открыть меню"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <IconMenu />
          </button>
          <button
            type="button"
            className="header__catalog"
            aria-expanded={isCatalogOpen}
            aria-controls="catalog-menu"
            onClick={() => onCatalogToggle(!isCatalogOpen)}
          >
            {isCatalogOpen ? <IconClose /> : <IconGrid />}
            {isCatalogOpen ? 'Закрыть каталог товаров' : 'Открыть каталог товаров'}
          </button>
        </div>
      </div>

      <div className="header__nav-row">
        <nav className="header__nav" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => (
            item.megaMenu ? (
              <div
                key={item.id}
                className="header__nav-item"
                onMouseEnter={() => openMegaMenuPanel(item.megaMenu)}
              >
                <button
                  type="button"
                  className={`header__nav-link header__nav-link--mega${activePage === item.id ? ' header__nav-link--active' : ''}${openMegaMenu === item.megaMenu ? ' header__nav-link--mega-open' : ''}`}
                  aria-expanded={openMegaMenu === item.megaMenu}
                  aria-controls={item.megaMenu === 'catalogs' ? 'catalogs-menu' : 'collections-menu'}
                  onClick={() => setOpenMegaMenu((current) => (current === item.megaMenu ? null : item.megaMenu))}
                >
                  <span>{item.label}</span>
                  <IconChevronDown />
                </button>
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                className={`header__nav-link${activePage === item.id ? ' header__nav-link--active' : ''}${item.accent ? ' header__nav-link--accent' : ''}`}
                onClick={() => {
                  closeMegaMenu()
                  onNavigate(item.id)
                }}
                onMouseEnter={closeMegaMenu}
              >
                {item.label}
              </button>
            )
          ))}
        </nav>

        <div className="header__actions header__actions--desktop">
          <button
            type="button"
            className="header__action"
            aria-label="Профиль"
            onClick={() => isAuthenticated ? onNavigate('account') : onAccountOpen('login')}
          >
            <IconAccount />
          </button>
          <button
            type="button"
            className="header__action header__action--favorites"
            aria-label="Избранное"
            onClick={onFavoritesOpen}
          >
            <IconWishlist />
            {favoritesCount > 0 && (
              <span className="header__badge" aria-hidden="true">{favoritesCount}</span>
            )}
          </button>
          <button
            type="button"
            className="header__action header__action--cart"
            aria-label="Корзина"
            onClick={onCartOpen}
          >
            <IconCart />
            {cartCount > 0 && (
              <span className="header__badge" aria-hidden="true">{cartCount}</span>
            )}
          </button>
        </div>
      </div>

      <CollectionsNavPanel
        isOpen={isCollectionsOpen}
        onClose={closeMegaMenu}
      />
      <CatalogsNavPanel
        isOpen={isCatalogsMegaOpen}
        onClose={closeMegaMenu}
      />
      <CatalogMenu
        isOpen={isCatalogOpen}
        onItemClick={onCatalogItemClick}
      />

      <div className={`header__mobile-menu${isMobileMenuOpen ? ' header__mobile-menu--open' : ''}`}>
        <div className="header__mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="header__mobile-menu-inner">
          <div className="header__mobile-menu-top">
            <button
              type="button"
              className="header__catalog header__catalog--mobile"
              aria-expanded={isCatalogOpen}
              aria-controls="catalog-menu"
              onClick={() => {
                onCatalogToggle(!isCatalogOpen)
                setIsMobileMenuOpen(false)
              }}
            >
              {isCatalogOpen ? <IconClose /> : <IconGrid />}
              {isCatalogOpen ? 'Закрыть каталог товаров' : 'Открыть каталог товаров'}
            </button>
            <button
              type="button"
              className="header__mobile-menu-close"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Закрыть меню"
            >
              <IconClose />
            </button>
          </div>
          <div className="header__mobile-menu-content">
            <nav className="header__mobile-nav">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`header__mobile-nav-link${activePage === item.id ? ' header__mobile-nav-link--active' : ''}${item.accent ? ' header__mobile-nav-link--accent' : ''}`}
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onNavigate(item.id)
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>

    {/* Floating Actions (visible when header is hidden) */}
    <div className={`floating-search${isHidden ? ' floating-actions--visible' : ''}`}>
      <button
        type="button"
        className="floating-search__btn"
        aria-label="Поиск"
        onClick={() => {
          setIsHidden(false)
          setIsSearchOpen(true)
        }}
      >
        <IconSearch />
      </button>
    </div>

    <div className={`floating-actions${isHidden ? ' floating-actions--visible' : ''}`}>
      <button
        type="button"
        className="floating-actions__btn"
        aria-label="Профиль"
        onClick={() => isAuthenticated ? onNavigate('account') : onAccountOpen('login')}
      >
        <IconAccount />
      </button>
      <button
        type="button"
        className="floating-actions__btn"
        aria-label="Избранное"
        onClick={onFavoritesOpen}
      >
        <IconWishlist />
        {favoritesCount > 0 && (
          <span className="floating-actions__badge" aria-hidden="true">{favoritesCount}</span>
        )}
      </button>
      <button
        type="button"
        className="floating-actions__btn"
        aria-label="Корзина"
        onClick={onCartOpen}
      >
        <IconCart />
        {cartCount > 0 && (
          <span className="floating-actions__badge" aria-hidden="true">{cartCount}</span>
        )}
      </button>
    </div>
    </>
  )
}

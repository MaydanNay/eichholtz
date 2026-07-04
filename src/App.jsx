import { useState, useEffect } from 'react'
import { useLocation, useNavigate, matchPath } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import CartDrawer from './components/CartDrawer'
import CartCheckoutModal from './components/CartCheckoutModal'
import FavoritesDrawer from './components/FavoritesDrawer'
import AuthModal from './components/AuthModal'
import ActionToast from './components/ActionToast'
import SiteMeta from './components/SiteMeta'
import EmptyPage from './components/EmptyPage'
import HomePage from './pages/HomePage'
import DesignersPage from './pages/DesignersPage'
import EventsPage from './pages/EventsPage'
import NewsArticlePage from './pages/NewsArticlePage'
import AboutPage from './pages/AboutPage'
import CataloguesPage from './pages/CataloguesPage'
import AllCollectionsPage from './pages/AllCollectionsPage'
import ContactsPage from './pages/ContactsPage'
import CollectionPage from './pages/CollectionPage'
import CategoryPage from './pages/CategoryPage'
import ProductPage from './pages/ProductPage'
import AccountPage from './pages/AccountPage'
import { parseProductIdFromSlug } from './utils/productUrl'
import { parseCollectionIdFromSlug } from './utils/collectionUrl'
import { parseCategoryIdFromSlug } from './utils/categoryUrl'
import './App.css'

const EMPTY_PAGES = {}

const SCROLL_TARGETS = {}

const PAGE_PATHS = {
  home: '/',
  designers: '/designers',
  collections: '/collections',
  catalogs: '/catalogues',
  events: '/events',
  about: '/about',
  contacts: '/contacts',
  account: '/account',
}

function resolveNavPage(pathname, overlayPage) {
  if (overlayPage) return overlayPage
  if (matchPath('/category/:categorySlug', pathname)) return 'home'
  if (matchPath('/catalog/:collectionSlug', pathname)) return 'catalogs'
  if (matchPath('/collection/:collectionSlug', pathname)) return 'collections'
  if (matchPath('/news/:id', pathname)) return 'events'
  if (pathname === '/designers') return 'designers'
  if (pathname === '/collections') return 'collections'
  if (pathname === '/catalogues') return 'catalogs'
  if (pathname === '/events') return 'events'
  if (pathname === '/about') return 'about'
  if (pathname === '/contacts') return 'contacts'
  return 'home'
}

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [overlayPage, setOverlayPage] = useState(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')

  const newsMatch = matchPath('/news/:id', location.pathname)
  const newsId = newsMatch?.params.id

  const productMatch = matchPath('/tproduct/:productSlug', location.pathname)
  const productId = parseProductIdFromSlug(productMatch?.params.productSlug)

  const categoryMatch = matchPath('/category/:categorySlug', location.pathname)
  const categoryId = parseCategoryIdFromSlug(categoryMatch?.params.categorySlug)

  const catalogCollectionMatch = matchPath('/catalog/:collectionSlug', location.pathname)
  const categoryCollectionMatch = matchPath('/collection/:collectionSlug', location.pathname)
  const collectionMatch = catalogCollectionMatch || categoryCollectionMatch
  const collectionId = parseCollectionIdFromSlug(collectionMatch?.params.collectionSlug)

  const activePage = resolveNavPage(location.pathname, overlayPage)

  useEffect(() => {
    document.body.style.overflow = isCartOpen || isCheckoutOpen || isFavoritesOpen || isCatalogOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isCartOpen, isCheckoutOpen, isFavoritesOpen, isCatalogOpen])

  // useEffect(() => {
  //   setIsCatalogOpen(false)
  // }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/') {
      setOverlayPage(null)
    }
  }, [location.pathname])

  const handleCatalogItemClick = (item) => {
    setOverlayPage(null)

    if (item.path) {
      navigate(item.path)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    navigate('/', {
      state: {
        categoryName: item.categoryName || null,
        collectionName: item.collectionName || null,
        scrollTo: item.scrollTo || (item.categoryName || item.collectionName ? 'products' : 'collection'),
        menuTs: Date.now(),
      },
    })
  }

  const handleNavigate = (page) => {

    if (SCROLL_TARGETS[page]) {
      setOverlayPage(null)
      if (location.pathname !== '/') {
        navigate('/')
        setTimeout(() => {
          document.getElementById(SCROLL_TARGETS[page])?.scrollIntoView({ behavior: 'smooth' })
        }, 50)
      } else {
        document.getElementById(SCROLL_TARGETS[page])?.scrollIntoView({ behavior: 'smooth' })
      }
      return
    }

    if (EMPTY_PAGES[page]) {
      setOverlayPage(page)
      navigate('/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setOverlayPage(null)
    const path = PAGE_PATHS[page] || '/'
    navigate(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenNews = (id) => {
    setOverlayPage(null)
    navigate(`/news/${id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToNews = () => {
    navigate('/events')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleOpenAuth = (tab = 'login') => {
    setAuthTab(tab)
    setIsAuthOpen(true)
  }

  const handleSearch = (query) => {
    setOverlayPage(null)
    navigate('/', {
      state: {
        searchQuery: query,
        scrollTo: 'products',
        menuTs: Date.now(),
      },
    })
  }

  const renderContent = () => {
    if (overlayPage && EMPTY_PAGES[overlayPage]) {
      return <EmptyPage title={EMPTY_PAGES[overlayPage]} />
    }

    if (newsId) {
      return <NewsArticlePage newsId={newsId} onBack={handleBackToNews} />
    }

    if (productId) {
      return (
        <ProductPage
          productId={productId}
          onCartOpen={() => setIsCartOpen(true)}
          onCheckout={() => setIsCheckoutOpen(true)}
        />
      )
    }

    if (productMatch) {
      return (
        <div className="product-page product-page--empty">
          <p className="product-page__status">Товар не найден</p>
          <button type="button" className="link-underline" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      )
    }

    if (categoryId) {
      return (
        <CategoryPage
          categoryId={categoryId}
          onCartOpen={() => setIsCartOpen(true)}
        />
      )
    }

    if (categoryMatch) {
      return (
        <div className="collection-page collection-page--empty">
          <p className="collection-page__status">Категория не найдена</p>
          <button type="button" className="link-underline" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      )
    }

    if (collectionId) {
      return (
        <CollectionPage
          collectionId={collectionId}
          onCartOpen={() => setIsCartOpen(true)}
        />
      )
    }

    if (collectionMatch) {
      return (
        <div className="collection-page collection-page--empty">
          <p className="collection-page__status">Коллекция не найдена</p>
          <button type="button" className="link-underline" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      )
    }

    if (location.pathname === '/events') {
      return (
        <EventsPage onOpenNews={handleOpenNews} />
      )
    }

    if (location.pathname === '/designers') {
      return <DesignersPage />
    }

    if (location.pathname === '/catalogues') {
      return <CataloguesPage />
    }

    if (location.pathname === '/collections') {
      return <AllCollectionsPage />
    }

    if (location.pathname === '/about') {
      return <AboutPage />
    }

    if (location.pathname === '/contacts') {
      return <ContactsPage />
    }

    if (location.pathname === '/account') {
      return <AccountPage />
    }

    return (
      <HomePage
        onNavigate={handleNavigate}
        onOpenNews={handleOpenNews}
        onCartOpen={() => setIsCartOpen(true)}
      />
    )
  }

  return (
    <>
      <Header
        activePage={activePage}
        onNavigate={handleNavigate}
        onSearch={handleSearch}
        onCartOpen={() => setIsCartOpen(true)}
        onFavoritesOpen={() => setIsFavoritesOpen(true)}
        onAccountOpen={handleOpenAuth}
        isCatalogOpen={isCatalogOpen}
        onCatalogToggle={setIsCatalogOpen}
        onCatalogItemClick={handleCatalogItemClick}
      />
      <main className="main">{renderContent()}</main>
      <Footer />
      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        onCartOpen={() => {
          setIsFavoritesOpen(false)
          setIsCartOpen(true)
        }}
      />
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false)
          setIsCheckoutOpen(true)
        }}
      />
      <CartCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authTab}
        onClose={() => setIsAuthOpen(false)}
      />
      <ActionToast />
      <SiteMeta />
    </>
  )
}

export default App

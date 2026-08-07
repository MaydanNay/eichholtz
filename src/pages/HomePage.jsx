import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getCategories } from '../api/categories'
import { getCollections } from '../api/collections'
import HeroSection from '../sections/HeroSection'
import CollectionSection from '../sections/CollectionSection'
import ProductsCatalogSection from '../sections/ProductsCatalogSection'
import LoyaltySection from '../sections/LoyaltySection'
import CatalogsSection from '../sections/CatalogsSection'
import NewsSection from '../sections/NewsSection'
import ContactsSection from '../sections/ContactsSection'

export default function HomePage({ onNavigate, onOpenNews, onCartOpen }) {
  const location = useLocation()
  const [collectionFilter, setCollectionFilter] = useState(null)
  const [catalogFilter, setCatalogFilter] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState(null)
  const [filterName, setFilterName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const state = location.state
    if (!state?.scrollTo && !state?.categoryName && !state?.collectionName && !state?.searchQuery) {
      return undefined
    }

    let cancelled = false

    const applyNavigation = async () => {
      if (state.searchQuery) {
        if (!cancelled) {
          setSearchQuery(state.searchQuery)
          setCollectionFilter(null)
          setCatalogFilter(null)
          setCategoryFilter(null)
          setFilterName('')
        }
      } else if (state.categoryName) {
        try {
          const categories = await getCategories(true)
          const match = categories.find((item) => item.name === state.categoryName)
          if (!cancelled && match) {
            setCategoryFilter(match.id)
            setCollectionFilter(null)
            setCatalogFilter(null)
            setFilterName(match.name)
            setSearchQuery('')
          }
        } catch {
          if (!cancelled) {
            setCategoryFilter(null)
            setFilterName('')
          }
        }
      } else if (state.collectionName) {
        try {
          const collections = await getCollections({ published: true })
          const match = collections.find((item) => item.name === state.collectionName)
          if (!cancelled && match) {
            setCollectionFilter(match.id)
            setCatalogFilter(null)
            setCategoryFilter(null)
            setFilterName(match.name)
            setSearchQuery('')
          }
        } catch {
          if (!cancelled) {
            setCollectionFilter(null)
            setFilterName('')
          }
        }
      } else if (!cancelled) {
        setCollectionFilter(null)
        setCatalogFilter(null)
        setCategoryFilter(null)
        setFilterName('')
      }

      window.setTimeout(() => {
        const targetId = state.scrollTo === 'collection' ? 'collection' : 'products'
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
      }, 120)
    }

    applyNavigation()
    window.history.replaceState({}, '')

    return () => {
      cancelled = true
    }
  }, [location.state?.menuTs])

  const handleCategorySelect = (category) => {
    setCategoryFilter(category.id)
    setCollectionFilter(null)
    setCatalogFilter(null)
    setFilterName(category.name)
    setSearchQuery('')
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setCollectionFilter(null)
    setCatalogFilter(null)
    setCategoryFilter(null)
    setFilterName('')
  }

  const handleClearSearchQuery = () => {
    setSearchQuery('')
  }

  return (
    <>
      <HeroSection />
      <CollectionSection onCategorySelect={handleCategorySelect} />
      <ProductsCatalogSection
        collectionFilter={collectionFilter}
        catalogFilter={catalogFilter}
        categoryFilter={categoryFilter}
        collectionFilterName={filterName}
        searchQuery={searchQuery}
        onClearCollectionFilter={handleClearFilters}
        onClearSearchQuery={handleClearSearchQuery}
        onCartOpen={onCartOpen}
      />
      <LoyaltySection onJoin={() => onNavigate?.('designers')} />
      <CatalogsSection onNavigate={onNavigate} />
      <NewsSection onOpenNews={onOpenNews} onNavigate={onNavigate} />
      <ContactsSection />
    </>
  )
}

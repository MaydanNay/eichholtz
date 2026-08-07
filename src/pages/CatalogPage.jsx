import { useEffect } from 'react'
import ProductsCatalogSection from '../sections/ProductsCatalogSection'
import { usePageMeta } from '../hooks/usePageMeta'

export default function CatalogPage({ onCartOpen }) {
  usePageMeta({
    title: 'Каталог товаров',
    description: 'Полный каталог товаров Eichholtz в Казахстане — мебель, освещение, аксессуары и outdoor.',
    path: '/catalog',
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <ProductsCatalogSection
      onCartOpen={onCartOpen}
      sidebarNavigates={false}
    />
  )
}

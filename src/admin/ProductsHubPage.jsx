import { useState, useEffect } from 'react'
import CategoriesPage from './CategoriesPage'
import ProductsPage from './ProductsPage'
import FilterOptionsPage from './FilterOptionsPage'
import ProductGroupsPage from './ProductGroupsPage'
import { api } from './api'

export default function ProductsHubPage() {
  const [activeTab, setActiveTab] = useState('products')
  const [counts, setCounts] = useState({ products: 0, categories: 0 })

  useEffect(() => {
    Promise.all([
      api.getProducts().catch(() => []),
      api.getCategories().catch(() => []),
    ]).then(([productsData, categoriesData]) => {
      setCounts({
        products: Array.isArray(productsData) ? productsData.length : 0,
        categories: Array.isArray(categoriesData) ? categoriesData.length : 0,
      })
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 2rem', borderBottom: '1px solid var(--color-ui-bg-light)', background: 'var(--color-core-white)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'products' ? 'bold' : 'normal',
              borderBottom: activeTab === 'products' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'products' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('products')}
          >
            Товары {counts.products > 0 ? `(${counts.products.toLocaleString('ru-RU')} товаров)` : ''}
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'categories' ? 'bold' : 'normal',
              borderBottom: activeTab === 'categories' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'categories' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('categories')}
          >
            Категории {counts.categories > 0 ? `(${counts.categories.toLocaleString('ru-RU')} категорий)` : ''}
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'filter_colors' ? 'bold' : 'normal',
              borderBottom: activeTab === 'filter_colors' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'filter_colors' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('filter_colors')}
          >
            Характеристики
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'product_groups' ? 'bold' : 'normal',
              borderBottom: activeTab === 'product_groups' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'product_groups' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('product_groups')}
          >
            Группы товаров
          </button>
        </div>
      </div>
      <div className="products-hub-content" style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'products' ? <ProductsPage />
          : activeTab === 'categories' ? <CategoriesPage />
          : activeTab === 'product_groups' ? <ProductGroupsPage />
          : <FilterOptionsPage />}
      </div>
    </div>
  )
}


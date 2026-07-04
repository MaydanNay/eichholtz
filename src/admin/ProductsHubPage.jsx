import { useState } from 'react'
import CategoriesPage from './CategoriesPage'
import ProductsPage from './ProductsPage'

export default function ProductsHubPage() {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 2rem', borderBottom: '1px solid #eee', background: '#fff', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'products' ? 'bold' : 'normal',
              borderBottom: activeTab === 'products' ? '2px solid #000' : '2px solid transparent',
              color: activeTab === 'products' ? '#000' : '#888',
              outline: 'none'
            }}
            onClick={() => setActiveTab('products')}
          >
            Товары
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'categories' ? 'bold' : 'normal',
              borderBottom: activeTab === 'categories' ? '2px solid #000' : '2px solid transparent',
              color: activeTab === 'categories' ? '#000' : '#888',
              outline: 'none'
            }}
            onClick={() => setActiveTab('categories')}
          >
            Категории
          </button>
        </div>
      </div>
      <div className="products-hub-content" style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'products' ? <ProductsPage /> : <CategoriesPage />}
      </div>
    </div>
  )
}

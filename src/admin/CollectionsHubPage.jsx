import { useState } from 'react'
import SeasonsPage from './SeasonsPage'
import CollectionsPage from './CollectionsPage'

export default function CollectionsHubPage() {
  const [activeTab, setActiveTab] = useState('collections')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 2rem', borderBottom: '1px solid var(--color-ui-bg-light)', background: 'var(--color-core-white)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'collections' ? 'bold' : 'normal',
              borderBottom: activeTab === 'collections' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'collections' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('collections')}
          >
            Коллекции
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'seasons' ? 'bold' : 'normal',
              borderBottom: activeTab === 'seasons' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'seasons' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('seasons')}
          >
            Сезоны
          </button>
        </div>
      </div>
      <div className="collections-hub-content" style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'collections' ? <CollectionsPage /> : <SeasonsPage />}
      </div>
    </div>
  )
}

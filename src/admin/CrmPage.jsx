import { useState } from 'react'
import OrdersPage from './OrdersPage'
import ClientsPage from './ClientsPage'

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState('orders')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0 2rem', borderBottom: '1px solid var(--color-ui-bg-light)', background: 'var(--color-core-white)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'orders' ? 'bold' : 'normal',
              borderBottom: activeTab === 'orders' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'orders' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('orders')}
          >
            Заказы
          </button>
          <button
            type="button"
            style={{
              background: 'none', border: 'none', padding: '1rem 0', fontSize: '1.1rem', cursor: 'pointer',
              fontWeight: activeTab === 'clients' ? 'bold' : 'normal',
              borderBottom: activeTab === 'clients' ? '2px solid var(--color-core-black)' : '2px solid transparent',
              color: activeTab === 'clients' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)',
              outline: 'none'
            }}
            onClick={() => setActiveTab('clients')}
          >
            Клиенты
          </button>
        </div>
      </div>
      <div className="crm-content" style={{ flex: 1, position: 'relative' }}>
        {activeTab === 'orders' ? <OrdersPage /> : <ClientsPage />}
      </div>
    </div>
  )
}

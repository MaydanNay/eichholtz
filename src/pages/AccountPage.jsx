import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFavorites } from '../context/FavoritesContext'
import { productUrl } from '../utils/productUrl'
import { userAuth } from '../api/userAuth'
import {
  formatOrderDate,
  formatOrderItems,
  formatOrderMoney,
  orderStatusLabel,
} from '../utils/orderFormat'
import Reveal from '../components/Reveal'

export default function AccountPage() {
  const { user, isAuthenticated, logout } = useAuth()
  const { favorites } = useFavorites()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
    
    if (!isAuthenticated) {
      navigate('/')
      return
    }

    let cancelled = false
    setOrdersLoading(true)
    setOrdersError('')

    userAuth.getMyOrders()
      .then((data) => {
        if (!cancelled) setOrders(data)
      })
      .catch((err) => {
        if (!cancelled) setOrdersError(err.message)
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated || !user) return null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="account-page section-padding">
      <div className="container">
        <Reveal variant="blur-up">
          <div className="account-page__inner">
            <h1 className="account-page__title">Мой аккаунт</h1>
            <div className="account-page__info">
              <p className="account-page__name">{user.name}</p>
              <p className="account-page__meta">{user.email}</p>
              {user.phone && <p className="account-page__meta">{user.phone}</p>}
            </div>

            <div className="account-page__tabs" style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-gray-light)' }}>
              <button 
                type="button" 
                onClick={() => setActiveTab('orders')}
                style={{ padding: '0.5rem 0', fontWeight: activeTab === 'orders' ? '500' : '400', borderBottom: activeTab === 'orders' ? '2px solid var(--color-core-black)' : '2px solid transparent', color: activeTab === 'orders' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)' }}
              >
                Мои заказы и заявки
              </button>
              <button 
                type="button" 
                onClick={() => setActiveTab('favorites')}
                style={{ padding: '0.5rem 0', fontWeight: activeTab === 'favorites' ? '500' : '400', borderBottom: activeTab === 'favorites' ? '2px solid var(--color-core-black)' : '2px solid transparent', color: activeTab === 'favorites' ? 'var(--color-core-black)' : 'var(--color-core-dark-grey)' }}
              >
                Мои избранные
              </button>
            </div>

            {activeTab === 'orders' && (
              <div className="account-page__orders">
                {ordersLoading ? (
                  <p className="account-page__orders-empty">Загрузка заказов...</p>
                ) : ordersError ? (
                  <p className="account-page__orders-empty account-page__orders-empty--error">{ordersError}</p>
                ) : orders.length === 0 ? (
                  <p className="account-page__orders-empty">У вас пока нет заказов или заявок</p>
                ) : (
                  <ul className="account-page__orders-list">
                    {orders.map((order) => (
                      <li key={order.id} className="account-page__order">
                        <div className="account-page__order-head">
                          <span className="account-page__order-id">Заявка/Заказ №{order.id}</span>
                          <span className="account-page__order-status">{orderStatusLabel(order.status)}</span>
                        </div>
                        <p className="account-page__order-date">{formatOrderDate(order.created_at)}</p>
                        <p className="account-page__order-items">{formatOrderItems(order.items)}</p>
                        <p className="account-page__order-total">{formatOrderMoney(order.total)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="account-page__favorites">
                {favorites.length === 0 ? (
                  <p className="account-page__orders-empty">В избранном пока ничего нет</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    {favorites.map((product) => (
                      <Link key={product.id} to={productUrl(product)} style={{ display: 'block', textDecoration: 'none', color: 'inherit', transition: 'opacity 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                        <div style={{ aspectRatio: '1', backgroundColor: 'var(--color-ui-bg-light)', marginBottom: '0.8rem', borderRadius: '4px', overflow: 'hidden' }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <img src="/logo.webp" alt="" className="img-fallback" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          )}
                        </div>
                        <p style={{ fontSize: '0.85rem', marginBottom: '0.2rem', color: 'var(--color-core-dark-grey)' }}>
                          {product.category_name || product.collection_name || product.category}
                        </p>
                        <p style={{ fontWeight: '500', fontSize: '0.95rem', lineHeight: '1.2' }}>{product.name}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="button" className="account-page__logout-btn" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

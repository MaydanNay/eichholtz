import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearToken } from './api'
import { AdminSearchProvider } from './AdminSearchContext'
import './admin.css'

const NAV_GROUPS = [
  {
    title: 'Сайт',
    items: [
      { to: '/admin/home', label: 'Главная' },
      { to: '/admin/news', label: 'Новости' },
      { to: '/admin/contacts', label: 'Контакты' },
    ],
  },
  {
    title: 'Коллекции и Товары',
    items: [
      { to: '/admin/collections', label: 'Сезоны и Коллекции' },
      { to: '/admin/catalogs', label: 'Каталоги' },
      { to: '/admin/products', label: 'Категории и Товары' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { to: '/admin/crm', label: 'Заказы и Клиенты' },
      { to: '/admin/users', label: 'Пользователи' },
    ],
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setSearchQuery('')
  }, [location.pathname])

  useEffect(() => {
    document.documentElement.classList.add('admin-mode')
    return () => {
      document.documentElement.classList.remove('admin-mode')
    }
  }, [])

  const handleLogout = () => {
    clearToken()
    navigate('/admin/login')
  }

  return (
    <AdminSearchProvider value={{ query: searchQuery, setQuery: setSearchQuery }}>
      <div className="admin">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span>Eichholtz</span>
            <small>Админ</small>
          </div>

          <nav className="admin-sidebar__nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="admin-sidebar__group">
                <p className="admin-sidebar__section">{group.title}</p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `admin-sidebar__link${isActive ? ' admin-sidebar__link--active' : ''}`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <button type="button" className="admin-sidebar__logout" onClick={handleLogout}>
            Выйти
          </button>
        </aside>

        <div className="admin-content custom-scroll">
          <Outlet />
        </div>
      </div>
    </AdminSearchProvider>
  )
}

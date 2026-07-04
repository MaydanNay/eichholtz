import { useEffect, useState } from 'react'
import { api } from './api'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import { useAdminSearch } from './AdminSearchContext'

export default function UsersPage() {
  const { query } = useAdminSearch()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setUsers(await api.getUsers(query))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить этого пользователя?')) return
    try {
      await api.deleteUser(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <>
      <AdminPageHeader
        title="Зарегистрированные пользователи"
        description="Список всех пользователей, зарегистрированных на сайте."
      />

      <div className="admin-table-container">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-gray-text)' }}>
            Загрузка...
          </p>
        ) : error ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : users.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-gray-text)' }}>
            Пользователи не найдены
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Дата регистрации</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  </td>
                  <td>
                    {user.phone ? (
                      <a href={`tel:${user.phone.replace(/[^+\d]/g, '')}`}>{user.phone}</a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString('ru-RU')}</td>
                  <td className="admin-table__actions">
                    <AdminRowMenu
                      items={[
                        { label: 'Удалить', onClick: () => handleDelete(user.id), danger: true }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

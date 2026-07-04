import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import { buildBasicRowMenuItems } from './adminMenuItems'

const SOURCES = {
  manual: 'Вручную',
  order: 'Заказ',
  inquiry: 'Заявка на цену',
  cart: 'Заявка из корзины',
}

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  company: '',
  notes: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU')
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₸`
}

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const { query: search } = useAdminSearch()
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async (query = search) => {
    try {
      setLoading(true)
      setClients(await api.getClients(query))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      load(search)
    }, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search])

  const stats = useMemo(() => ({
    total: clients.length,
    withOrders: clients.filter((c) => c.orders_count > 0).length,
    inquiries: clients.filter((c) => c.source === 'inquiry').length,
  }), [clients])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  const openEdit = (client) => {
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company || '',
      notes: client.notes || '',
    })
    setEditingId(client.id)
    setShowForm(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingId) {
        await api.updateClient(editingId, form)
      } else {
        await api.createClient(form)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить клиента? Заказы останутся, но будут отвязаны.')) return
    try {
      await api.deleteClient(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Клиенты"
        hint="CRM-список: контакты из заказов, заявок на цену и ручного добавления."
      >
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить клиента
        </button>
      </AdminPageHeader>

      <div className="admin-toolbar">
        <div className="admin-toolbar__stats">
          <span>Всего: {stats.total}</span>
          <span>С заказами: {stats.withOrders}</span>
          <span>Заявки: {stats.inquiries}</span>
        </div>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать клиента' : 'Новый клиент'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Имя *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>Компания</span>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Телефон</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="admin-field admin-field--full">
              <span>Заметки</span>
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary">Сохранить</button>
            <button type="button" className="admin-btn" onClick={() => setShowForm(false)}>Отмена</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="admin-muted">Загрузка...</p>
      ) : clients.length === 0 ? (
        <p className="admin-muted">
          {search ? 'Ничего не найдено' : 'Клиентов пока нет'}
        </p>
      ) : (
        <table className="admin-table admin-table--clients">
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Контакты</th>
              <th>Заказов</th>
              <th>Сумма</th>
              <th>Последняя активность</th>
              <th>Источник</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <strong>{client.name}</strong>
                  {client.company && <div className="admin-table__sub">{client.company}</div>}
                </td>
                <td>
                  <div>{client.email || '—'}</div>
                  <div className="admin-table__sub">{client.phone || '—'}</div>
                </td>
                <td>{client.orders_count || 0}</td>
                <td>{formatMoney(client.total_spent)}</td>
                <td>{formatDate(client.last_order_at || client.updated_at)}</td>
                <td>{SOURCES[client.source] || client.source}</td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={buildBasicRowMenuItems({
                      onEdit: () => openEdit(client),
                      onDelete: () => handleDelete(client.id),
                    })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

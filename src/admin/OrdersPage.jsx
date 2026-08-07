import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { matchesAdminSearch, useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import { buildBasicRowMenuItems } from './adminMenuItems'

const STATUSES = [
  { value: 'new', label: 'Новый' },
  { value: 'read', label: 'Прочитано' },
  { value: 'accepted', label: 'Принят' },
  { value: 'closed', label: 'Закрыт' },
]

const EMPTY = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  items: '',
  status: 'new',
  total: '',
  notes: '',
}

const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label || value

function formatOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '—'
  return items
    .map((item) => {
      const qty = item.qty || item.quantity || 1
      return qty > 1 ? `${item.name} ×${qty}` : item.name
    })
    .join(', ')
}

function formatMoney(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return '—'
  return `${amount.toLocaleString('ru-RU')} ₸`
}

export default function OrdersPage() {
  const { query } = useAdminSearch()
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      setOrders(await api.getOrders())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredOrders = useMemo(
    () => orders.filter((order) =>
      matchesAdminSearch(
        query,
        order.id,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        statusLabel(order.status),
        order.status,
        order.notes,
        formatOrderItems(order.items),
      ),
    ),
    [orders, query],
  )

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  const openEdit = (order) => {
    setForm({
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      items: JSON.stringify(order.items, null, 2),
      status: order.status,
      total: order.total,
      notes: order.notes,
    })
    setEditingId(order.id)
    setShowForm(true)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    let items = []
    try {
      items = form.items ? JSON.parse(form.items) : []
    } catch {
      setError('Некорректный JSON в поле товаров')
      return
    }

    const data = {
      ...form,
      items,
      total: parseFloat(form.total) || 0,
    }

    try {
      if (editingId) {
        await api.updateOrder(editingId, data)
      } else {
        await api.createOrder(data)
      }
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить заказ?')) return
    setError('')
    try {
      await api.deleteOrder(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCloseOrder = async (order) => {
    setError('')
    try {
      await api.updateOrder(order.id, {
        customer_name: order.customer_name,
        customer_email: order.customer_email || '',
        customer_phone: order.customer_phone || '',
        items: JSON.stringify(order.items || []),
        status: 'read',
        total: order.total || 0,
        notes: order.notes || ''
      })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader title="Заказы">
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить заказ
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать заказ' : 'Новый заказ'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Имя клиента *</span>
              <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>Email</span>
              <input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Телефон</span>
              <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Статус</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Сумма</span>
              <input type="number" step="0.01" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
            </label>
            <label className="admin-field admin-field--full">
              <span>Товары (JSON)</span>
              <textarea rows={4} value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} placeholder='[{"name":"Диван","qty":1,"price":500000}]' />
            </label>
            <label className="admin-field admin-field--full">
              <span>Заметки</span>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
      ) : filteredOrders.length === 0 ? (
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Заказов пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Клиент</th>
              <th>Товары</th>
              <th>Телефон</th>
              <th>Статус</th>
              <th>Сумма</th>
              <th>Дата</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>
                  <div>{o.customer_name}</div>
                  {o.notes && <div className="admin-table__sub">{o.notes}</div>}
                </td>
                <td className="admin-table__items">{formatOrderItems(o.items)}</td>
                <td>{o.customer_phone || '—'}</td>
                <td><span className={`admin-badge admin-badge--${o.status}`}>{statusLabel(o.status)}</span></td>
                <td>{formatMoney(o.total)}</td>
                <td>{new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={[
                      ...(o.status === 'new' ? [{
                        label: 'Отметить как прочитанное',
                        onClick: () => handleCloseOrder(o),
                      }] : []),
                      ...buildBasicRowMenuItems({
                        onEdit: () => openEdit(o),
                        onDelete: () => handleDelete(o.id),
                      })
                    ]}
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

const ORDER_STATUSES = [
  { value: 'new', label: 'Новый' },
  { value: 'read', label: 'Прочитано' },
  { value: 'accepted', label: 'Принят' },
  { value: 'closed', label: 'Закрыт' },
]

export function orderStatusLabel(status) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label || status
}

export function formatOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) return '—'
  return items
    .map((item) => {
      const qty = item.qty || item.quantity || 1
      return qty > 1 ? `${item.name} ×${qty}` : item.name
    })
    .join(', ')
}

export function formatOrderMoney(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return 'По запросу'
  return `${amount.toLocaleString('ru-RU')} ₸`
}

export function formatOrderDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

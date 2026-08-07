import { CONTACT_INFO } from '../data/contacts'

function formatPrice(value) {
  const amount = Number(value) || 0
  if (amount <= 0) return ''
  return `${amount.toLocaleString('ru-RU')} ₸`
}

/** Build wa.me URL with prefilled inquiry text for the site WhatsApp. */
export function buildInquiryWhatsAppUrl({
  name = '',
  phone = '',
  message = '',
  productName = '',
  cartItems = null,
  total = 0,
  kind = '',
} = {}) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const lines = []

  if (Array.isArray(cartItems) && cartItems.length > 0) {
    lines.push('Здравствуйте! Меня интересует расчёт/заказ по следующим товарам:')
    for (const item of cartItems) {
      const link = item.id ? `${origin}/tproduct/${item.id}` : ''
      const qty = item.quantity ?? item.qty ?? 1
      lines.push(link ? `• ${item.name} (${qty} шт.) — ${link}` : `• ${item.name} (${qty} шт.)`)
    }
    const totalLabel = formatPrice(total)
    if (totalLabel) lines.push(`\nИтого на сайте: ${totalLabel}`)
  } else if (productName) {
    lines.push(`Здравствуйте! Интересует стоимость товара: ${productName}`)
  } else if (kind === 'designers') {
    lines.push('Здравствуйте! Хочу вступить в программу лояльности для дизайнеров.')
    if (message?.trim()) lines.push(message.trim())
  } else if (message?.trim()) {
    lines.push('Здравствуйте! Заявка с сайта:')
    lines.push(message.trim())
  } else {
    lines.push('Здравствуйте! Хочу оставить заявку.')
  }

  if (name?.trim()) lines.push(`\nИмя: ${name.trim()}`)
  if (phone?.trim()) lines.push(`Телефон: ${phone.trim()}`)
  if (message?.trim() && (cartItems?.length || productName)) {
    lines.push(`Комментарий: ${message.trim()}`)
  }

  return `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`
}

/** Open WhatsApp chat after a successful CRM save. */
export function openInquiryWhatsApp(payload) {
  const url = buildInquiryWhatsAppUrl(payload)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  return url
}

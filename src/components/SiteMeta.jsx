import { useLocation } from 'react-router-dom'
import { usePageMeta, DEFAULT_DESCRIPTION } from '../hooks/usePageMeta'

const STATIC_META = {
  '/': {
    description: DEFAULT_DESCRIPTION,
  },
  '/designers': {
    title: 'Дизайнерам',
    description: 'Программа для дизайнеров интерьера Eichholtz в Казахстане — каталоги, консультации и сотрудничество.',
  },
  '/catalogues': {
    title: 'Каталоги',
    description: 'Каталоги коллекций Eichholtz — мебель, освещение и декор для интерьера.',
  },
  '/catalog': {
    title: 'Каталог товаров',
    description: 'Полный каталог товаров Eichholtz в Казахстане — мебель, освещение, аксессуары и outdoor.',
  },
  '/events': {
    title: 'Мероприятия',
    description: 'Новости и мероприятия Eichholtz Казахстан.',
  },
  '/about': {
    title: 'О компании',
    description: 'О бренде Eichholtz в Казахстане — история, философия и подход к дизайну интерьера.',
  },
  '/contacts': {
    title: 'Контакты',
    description: 'Контакты шоурума Eichholtz в Казахстане — адрес, телефон и форма обратной связи.',
  },
}

export default function SiteMeta() {
  const { pathname } = useLocation()
  const isDynamicPage = pathname.startsWith('/tproduct/')
    || pathname.startsWith('/news/')
    || pathname.startsWith('/collection/')
    || pathname.startsWith('/catalog/')
  const meta = STATIC_META[pathname]

  usePageMeta({
    enabled: !isDynamicPage,
    title: meta?.title,
    description: meta?.description || DEFAULT_DESCRIPTION,
    path: pathname,
  })

  return null
}

import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { getHomeSettings } from '../api/homeSettings'
import { matchesAdminSearch, useAdminSearch } from './AdminSearchContext'
import AdminPageHeader from './AdminPageHeader'
import AdminRowMenu from './AdminRowMenu'
import ImageGalleryUploadField from './ImageGalleryUploadField'
import { buildPublishedRowMenuItems } from './adminMenuItems'
import { imagesFromProduct } from './uploadUtils'
import { useAdminGalleryUpload } from './useAdminImageUpload'

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category: '',
  category_id: '',
  extra_categories: [],
  images: [],
  collection_id: '',
  catalog_id: '',
  in_stock: true,
  published: true,
  sku: '',
  product_group: '',
  finish: '',
  height: '',
  diameter: '',
  width: '',
  depth: '',
  material: '',
  color: '',
  fabric: '',
}

function productSpecs(product) {
  let specs = product?.specs
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs)
    } catch {
      specs = {}
    }
  }
  if (!specs || typeof specs !== 'object') return {}
  return specs
}

function productSku(product) {
  const specs = productSpecs(product)
  return String(specs.sku || '').trim()
}

/** Form fields are strings; arrays (multi color/material) → stable join for selects/filters. */
function specFieldToForm(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean).join(' | ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

function productExtraCategoryIds(product) {
  const raw = productSpecs(product).extra_categories
  if (!Array.isArray(raw)) return []
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
}

function flattenCategoriesTree(categories) {
  const byParent = new Map()
  for (const cat of categories) {
    const parent = cat.parent_id == null ? null : Number(cat.parent_id)
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(cat)
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.name || '').localeCompare(String(b.name || ''), 'ru'),
    )
  }

  const result = []
  const seen = new Set()
  const walk = (parentId, depth) => {
    for (const node of byParent.get(parentId) || []) {
      const id = Number(node.id)
      if (seen.has(id)) continue
      seen.add(id)
      result.push({ ...node, depth })
      walk(id, depth + 1)
    }
  }
  walk(null, 0)

  for (const cat of categories) {
    const id = Number(cat.id)
    if (!seen.has(id)) result.push({ ...cat, depth: 0 })
  }
  return result
}

function specsFromProduct(product) {
  const specs = productSpecs(product)
  const finish = specs.finish || specs.variation || ''
  return {
    sku: specFieldToForm(specs.sku),
    product_group: specFieldToForm(specs.product_group),
    finish: specFieldToForm(finish),
    height: specFieldToForm(specs.height),
    diameter: specFieldToForm(specs.diameter),
    width: specFieldToForm(specs.width),
    depth: specFieldToForm(specs.depth),
    material: specFieldToForm(specs.material),
    color: specFieldToForm(specs.color),
    fabric: specFieldToForm(specs.fabric),
    extra_categories: productExtraCategoryIds(product).map(String),
  }
}

function buildPayload(form) {
  const primaryId = form.category_id ? Number(form.category_id) : null
  const extraCategories = (form.extra_categories || [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n !== primaryId)

  return {
    name: form.name,
    description: form.description,
    price: parseFloat(form.price) || 0,
    category: form.category,
    images: form.images,
    image_url: form.images[0] || '',
    collection_id: form.collection_id ? Number(form.collection_id) : null,
    catalog_id: form.catalog_id ? Number(form.catalog_id) : null,
    category_id: primaryId,
    in_stock: form.in_stock,
    published: form.published,
    // Partial specs patch — server merges into existing (keeps sku extras etc. if omitted,
    // but we send sku/product_group/finish/extra_categories explicitly so they stay editable)
    specs: {
      sku: form.sku,
      product_group: form.product_group,
      finish: form.finish,
      height: form.height,
      diameter: form.diameter,
      width: form.width,
      depth: form.depth,
      material: form.material,
      color: form.color,
      fabric: form.fabric,
      extra_categories: extraCategories,
    },
  }
}

const SORT_OPTIONS = [
  { value: 'id_desc', label: 'Сначала новые (ID ↓)' },
  { value: 'id_asc', label: 'Сначала старые (ID ↑)' },
  { value: 'price_asc', label: 'Цена: с 0 / по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'name_asc', label: 'Название: А—Я' },
  { value: 'name_desc', label: 'Название: Я—А' },
]

function productPrice(product) {
  const n = Number(product?.price)
  return Number.isFinite(n) ? n : 0
}

function productExtraCollections(product) {
  const raw = productSpecs(product).extra_collections
  if (Array.isArray(raw)) return raw.map((v) => String(v))
  if (raw == null || raw === '') return []
  return [String(raw)]
}

function categorySubtreeIds(categories, rootId) {
  const root = Number(rootId)
  if (!Number.isFinite(root)) return new Set()
  const byParent = new Map()
  for (const cat of categories) {
    const parent = cat.parent_id == null ? null : Number(cat.parent_id)
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent).push(Number(cat.id))
  }
  const ids = new Set([root])
  const stack = [root]
  while (stack.length) {
    const current = stack.pop()
    for (const child of byParent.get(current) || []) {
      if (!ids.has(child)) {
        ids.add(child)
        stack.push(child)
      }
    }
  }
  return ids
}

function matchesCategoryFilter(product, filterCategoryId, categories) {
  if (!filterCategoryId) return true
  if (filterCategoryId === 'none') {
    return !product.category_id && productExtraCategoryIds(product).length === 0
  }
  const allowed = categorySubtreeIds(categories, filterCategoryId)
  if (allowed.has(Number(product.category_id))) return true
  return productExtraCategoryIds(product).some((id) => allowed.has(id))
}

function matchesCollectionFilter(product, filterCollectionId, collections) {
  if (!filterCollectionId) return true
  if (filterCollectionId === 'none') return !product.collection_id
  if (String(product.collection_id) === String(filterCollectionId)) return true
  const coll = collections.find((c) => String(c.id) === String(filterCollectionId))
  if (!coll) return false
  const extras = productExtraCollections(product)
  return extras.includes(String(coll.name)) || extras.includes(String(coll.id))
}

function sortProducts(list, sortValue) {
  const sorted = [...list]
  sorted.sort((a, b) => {
    if (sortValue === 'price_asc') {
      const d = productPrice(a) - productPrice(b)
      return d !== 0 ? d : b.id - a.id
    }
    if (sortValue === 'price_desc') {
      const d = productPrice(b) - productPrice(a)
      return d !== 0 ? d : b.id - a.id
    }
    if (sortValue === 'name_asc') {
      return String(a.name || '').localeCompare(String(b.name || ''), 'ru') || b.id - a.id
    }
    if (sortValue === 'name_desc') {
      return String(b.name || '').localeCompare(String(a.name || ''), 'ru') || b.id - a.id
    }
    if (sortValue === 'id_asc') return a.id - b.id
    return b.id - a.id
  })
  return sorted
}

export default function ProductsPage() {
  const { query } = useAdminSearch()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [collections, setCollections] = useState([])
  const [catalogs, setCatalogs] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [productAttributes, setProductAttributes] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortValue, setSortValue] = useState('id_desc')
  const [filterCategoryId, setFilterCategoryId] = useState('')
  const [filterCollectionId, setFilterCollectionId] = useState('')
  const [filterCatalogId, setFilterCatalogId] = useState('')
  const [filterPublished, setFilterPublished] = useState('all')
  const [filterStock, setFilterStock] = useState('all')
  const [filterPrice, setFilterPrice] = useState('all')
  const galleryUpload = useAdminGalleryUpload()

  const load = async () => {
    try {
      const [productsData, categoriesData, collectionsData, catalogsData, settingsData] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getCollections({ kind: 'category' }),
        api.getCollections({ kind: 'catalog' }),
        getHomeSettings(),
      ])
      setProducts(productsData)
      setCategories(categoriesData)
      setCollections(collectionsData)
      setCatalogs(catalogsData)
      
      if (settingsData.product_attributes) {
        try {
          setProductAttributes(JSON.parse(settingsData.product_attributes))
        } catch (e) {
          setProductAttributes({})
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ru')),
    [categories],
  )

  const categoryTreeOptions = useMemo(
    () => flattenCategoriesTree(categories),
    [categories],
  )

  const toggleExtraCategory = (categoryId) => {
    const sid = String(categoryId)
    setForm((current) => {
      const selected = new Set((current.extra_categories || []).map(String))
      if (selected.has(sid)) selected.delete(sid)
      else selected.add(sid)
      return { ...current, extra_categories: [...selected] }
    })
  }

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => {
      const sa = `${a.season_name || ''} ${a.name || ''}`
      const sb = `${b.season_name || ''} ${b.name || ''}`
      return sa.localeCompare(sb, 'ru')
    }),
    [collections],
  )

  const sortedCatalogs = useMemo(
    () => [...catalogs].sort((a, b) => {
      const sa = `${a.season_name || ''} ${a.name || ''}`
      const sb = `${b.season_name || ''} ${b.name || ''}`
      return sa.localeCompare(sb, 'ru')
    }),
    [catalogs],
  )

  const activeFilterCount = [
    filterCategoryId,
    filterCollectionId,
    filterCatalogId,
    filterPublished !== 'all' ? filterPublished : '',
    filterStock !== 'all' ? filterStock : '',
    filterPrice !== 'all' ? filterPrice : '',
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0 || sortValue !== 'id_desc'

  const resetFilters = () => {
    setSortValue('id_desc')
    setFilterCategoryId('')
    setFilterCollectionId('')
    setFilterCatalogId('')
    setFilterPublished('all')
    setFilterStock('all')
    setFilterPrice('all')
  }

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (!matchesAdminSearch(
        query,
        product.id,
        productSku(product),
        product.name,
        product.category,
        product.category_name,
        product.collection_name,
        product.catalog_name,
        product.description,
      )) return false

      if (!matchesCategoryFilter(product, filterCategoryId, categories)) return false
      if (!matchesCollectionFilter(product, filterCollectionId, collections)) return false

      if (filterCatalogId) {
        if (filterCatalogId === 'none') {
          if (product.catalog_id) return false
        } else if (String(product.catalog_id) !== String(filterCatalogId)) {
          return false
        }
      }

      if (filterPublished === 'yes' && !product.published) return false
      if (filterPublished === 'no' && !!product.published) return false

      if (filterStock === 'yes' && !product.in_stock) return false
      if (filterStock === 'no' && !!product.in_stock) return false

      if (filterPrice === 'zero' && productPrice(product) !== 0) return false
      if (filterPrice === 'nonzero' && productPrice(product) === 0) return false

      return true
    })

    return sortProducts(filtered, sortValue)
  }, [
    products,
    categories,
    collections,
    query,
    sortValue,
    filterCategoryId,
    filterCollectionId,
    filterCatalogId,
    filterPublished,
    filterStock,
    filterPrice,
  ])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    galleryUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (product) => {
    const images = imagesFromProduct(product)
    const specsFields = specsFromProduct(product)
    const primaryId = product.category_id ? String(product.category_id) : ''
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      images,
      category_id: primaryId,
      collection_id: product.collection_id || '',
      catalog_id: product.catalog_id || '',
      in_stock: !!product.in_stock,
      published: !!product.published,
      ...specsFields,
      extra_categories: (specsFields.extra_categories || []).filter((id) => id !== primaryId),
    })
    setEditingId(product.id)
    galleryUpload.initEdit(images)
    setShowForm(true)
    setError('')
  }

  const closeForm = async () => {
    await galleryUpload.discardPending()
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const data = buildPayload(form)

    try {
      if (editingId) {
        await api.updateProduct(editingId, data)
        await galleryUpload.finalizeSave(data.images, editingId)
      } else {
        await api.createProduct(data)
        galleryUpload.initCreate()
      }

      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить товар?')) return

    const product = products.find((item) => item.id === id)

    try {
      await api.deleteProduct(id)
      await galleryUpload.deleteAllSaved(imagesFromProduct(product))
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePublished = async (product) => {
    try {
      await api.updateProduct(product.id, { published: !product.published })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHeader title={`Товары (${filteredProducts.length.toLocaleString('ru-RU')} товаров)`}>
        <button
          type="button"
          className={`admin-btn${filtersOpen || hasActiveFilters ? ' admin-btn--primary' : ''}`}
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          Фильтры{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить товар
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {filtersOpen && (
        <div className="admin-filters">
          <label className="admin-filters__field">
            <span>Сортировка</span>
            <select value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="admin-filters__field">
            <span>Категория</span>
            <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)}>
              <option value="">Все категории</option>
              <option value="none">Без категории</option>
              {sortedCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-filters__field">
            <span>Коллекция</span>
            <select value={filterCollectionId} onChange={(e) => setFilterCollectionId(e.target.value)}>
              <option value="">Все коллекции</option>
              <option value="none">Без коллекции</option>
              {sortedCollections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.season_name ? `${c.season_name} — ` : ''}{c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filters__field">
            <span>Каталог</span>
            <select value={filterCatalogId} onChange={(e) => setFilterCatalogId(e.target.value)}>
              <option value="">Все каталоги</option>
              <option value="none">Без каталога</option>
              {sortedCatalogs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.season_name ? `${c.season_name} — ` : ''}{c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filters__field">
            <span>Статус</span>
            <select value={filterPublished} onChange={(e) => setFilterPublished(e.target.value)}>
              <option value="all">Все</option>
              <option value="yes">Опубликован</option>
              <option value="no">Не опубликован</option>
            </select>
          </label>
          <label className="admin-filters__field">
            <span>В наличии</span>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
              <option value="all">Все</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </label>
          <label className="admin-filters__field">
            <span>Цена</span>
            <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)}>
              <option value="all">Любая</option>
              <option value="zero">Только 0</option>
              <option value="nonzero">Только с ценой</option>
            </select>
          </label>
          {hasActiveFilters && (
            <button type="button" className="admin-btn admin-filters__reset" onClick={resetFilters}>
              Сбросить
            </button>
          )}
        </div>
      )}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать товар' : 'Новый товар'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Название *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>SKU</span>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Группа товаров</span>
              <input
                value={form.product_group}
                onChange={(e) => setForm({ ...form, product_group: e.target.value })}
                placeholder="например: Искусственные цветы и зелень"
              />
            </label>
            <label className="admin-field">
              <span>Основная категория</span>
              <select
                value={form.category_id}
                onChange={(e) => {
                  const nextId = e.target.value
                  setForm({
                    ...form,
                    category_id: nextId,
                    extra_categories: (form.extra_categories || []).filter((id) => id !== nextId),
                  })
                }}
              >
                <option value="">Без категории</option>
                {categoryTreeOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${'— '.repeat(c.depth || 0)}${c.name}`}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-field admin-field--full">
              <span>Доп. категории (extra)</span>
              <p className="admin-muted" style={{ margin: '0 0 0.5rem' }}>
                Товар также будет виден в выбранных разделах каталога (кроме основной).
              </p>
              <div
                style={{
                  maxHeight: '220px',
                  overflow: 'auto',
                  border: '1px solid var(--color-ui-bg-light, #e5e5e5)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--color-core-white, #fff)',
                }}
              >
                {categoryTreeOptions.length === 0 ? (
                  <span className="admin-muted">Категорий пока нет</span>
                ) : (
                  categoryTreeOptions.map((c) => {
                    const sid = String(c.id)
                    const isPrimary = sid === String(form.category_id)
                    const checked = (form.extra_categories || []).includes(sid)
                    return (
                      <label
                        key={c.id}
                        className="admin-field admin-field--checkbox"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          paddingLeft: `${(c.depth || 0) * 16}px`,
                          marginBottom: '0.35rem',
                          opacity: isPrimary ? 0.5 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isPrimary || checked}
                          disabled={isPrimary}
                          onChange={() => toggleExtraCategory(c.id)}
                        />
                        <span>
                          {c.name}
                          {isPrimary ? ' (основная)' : ''}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
            <label className="admin-field">
              <span>Коллекция</span>
              <select
                value={form.collection_id}
                onChange={(e) => setForm({ ...form, collection_id: e.target.value })}
              >
                <option value="">Без коллекции</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.season_name ? `${c.season_name} — ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Каталог</span>
              <select
                value={form.catalog_id}
                onChange={(e) => setForm({ ...form, catalog_id: e.target.value })}
              >
                <option value="">Без каталога</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.season_name ? `${c.season_name} — ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Цена</span>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <ImageGalleryUploadField
              images={form.images}
              onAdd={(url) => galleryUpload.addImage(
                form.images,
                url,
                (images) => setForm((current) => ({ ...current, images })),
              )}
              onRemove={(url) => galleryUpload.removeImage(
                form.images,
                url,
                (images) => setForm((current) => ({ ...current, images })),
              )}
              onChangeOrder={(newImages) => setForm((current) => ({ ...current, images: newImages }))}
            />
            <label className="admin-field admin-field--full">
              <span>Описание</span>
              <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Отделка</span>
              <select value={form.finish} onChange={(e) => setForm({ ...form, finish: e.target.value })}>
                <option value="">Без отделки</option>
                {(productAttributes?.finish?.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Цвет</span>
              <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                <option value="">Без цвета</option>
                {(productAttributes?.color?.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Материал</span>
              <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}>
                <option value="">Без материала</option>
                {(productAttributes?.material?.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Ткань</span>
              <select value={form.fabric} onChange={(e) => setForm({ ...form, fabric: e.target.value })}>
                <option value="">Без ткани</option>
                {(productAttributes?.fabric?.options || []).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.value}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Высота</span>
              <input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="700" />
            </label>
            <label className="admin-field">
              <span>Диаметр</span>
              <input value={form.diameter} onChange={(e) => setForm({ ...form, diameter: e.target.value })} placeholder="325" />
            </label>
            <label className="admin-field">
              <span>Ширина</span>
              <input value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
            </label>
            <label className="admin-field">
              <span>Глубина</span>
              <input value={form.depth} onChange={(e) => setForm({ ...form, depth: e.target.value })} />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} />
              <span>В наличии</span>
            </label>
            <label className="admin-field admin-field--checkbox">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              <span>Опубликовано на сайте</span>
            </label>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary">Сохранить</button>
            <button type="button" className="admin-btn" onClick={closeForm}>Отмена</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="admin-muted">Загрузка...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="admin-muted">{query || hasActiveFilters ? 'Ничего не найдено' : 'Товаров пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>ID</th>
              <th>SKU</th>
              <th>Название</th>
              <th>Категория</th>
              <th>Коллекция</th>
              <th>Каталог</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>В наличии</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, index) => (
              <tr key={p.id}>
                <td className="admin-table__num">{index + 1}</td>
                <td>{p.id}</td>
                <td>{productSku(p) || '—'}</td>
                <td>{p.name}</td>
                <td>{p.category_name || '—'}</td>
                <td>{p.collection_name || '—'}</td>
                <td>{p.catalog_name || '—'}</td>
                <td>{p.price?.toLocaleString('ru-RU')} ₸</td>
                <td>
                  <span className={`admin-badge ${p.published ? 'admin-badge--completed' : 'admin-badge--unpublished'}`}>
                    {p.published ? 'Опубликован' : 'Не опубликован'}
                  </span>
                </td>
                <td>{p.in_stock ? 'Да' : 'Нет'}</td>
                <td className="admin-table__actions">
                  <AdminRowMenu
                    items={buildPublishedRowMenuItems({
                      published: p.published,
                      onTogglePublish: () => togglePublished(p),
                      onEdit: () => openEdit(p),
                      onDelete: () => handleDelete(p.id),
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

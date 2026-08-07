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
  images: [],
  collection_id: '',
  catalog_id: '',
  in_stock: true,
  published: true,
  variation: '',
  height: '',
  diameter: '',
  width: '',
  depth: '',
  material: '',
  color: '',
  fabric: '',
}

function specsFromProduct(product) {
  let specs = product?.specs
  if (typeof specs === 'string') {
    try {
      specs = JSON.parse(specs)
    } catch {
      specs = {}
    }
  }
  if (!specs || typeof specs !== 'object') specs = {}
  return {
    variation: specs.variation || '',
    height: specs.height || '',
    diameter: specs.diameter || '',
    width: specs.width || '',
    depth: specs.depth || '',
    material: specs.material || '',
    color: specs.color || '',
    fabric: specs.fabric || '',
  }
}

function buildPayload(form) {
  return {
    name: form.name,
    description: form.description,
    price: parseFloat(form.price) || 0,
    category: form.category,
    images: form.images,
    image_url: form.images[0] || '',
    collection_id: form.collection_id ? Number(form.collection_id) : null,
    catalog_id: form.catalog_id ? Number(form.catalog_id) : null,
    category_id: form.category_id ? Number(form.category_id) : null,
    in_stock: form.in_stock,
    published: form.published,
    specs: {
      variation: form.variation,
      height: form.height,
      diameter: form.diameter,
      width: form.width,
      depth: form.depth,
      material: form.material,
      color: form.color,
      fabric: form.fabric,
    },
  }
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

  const filteredProducts = useMemo(
    () => products.filter((product) =>
      matchesAdminSearch(
        query,
        product.id,
        product.name,
        product.category,
        product.category_name,
        product.collection_name,
        product.catalog_name,
        product.description,
      ),
    ),
    [products, query],
  )

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    galleryUpload.initCreate()
    setShowForm(true)
    setError('')
  }

  const openEdit = (product) => {
    const images = imagesFromProduct(product)
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      images,
      category_id: product.category_id || '',
      collection_id: product.collection_id || '',
      catalog_id: product.catalog_id || '',
      in_stock: !!product.in_stock,
      published: !!product.published,
      ...specsFromProduct(product),
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
        <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
          + Добавить товар
        </button>
      </AdminPageHeader>

      {error && <p className="admin-error">{error}</p>}

      {showForm && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Редактировать товар' : 'Новый товар'}</h2>
          <div className="admin-form__grid">
            <label className="admin-field">
              <span>Название *</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="admin-field">
              <span>Категория</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Без категории</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
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
              <select value={form.variation} onChange={(e) => setForm({ ...form, variation: e.target.value })}>
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
        <p className="admin-muted">{query ? 'Ничего не найдено' : 'Товаров пока нет'}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>ID</th>
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

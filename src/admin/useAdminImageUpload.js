import { useRef } from 'react'
import { api } from './api'
import { isManagedImage } from './uploadUtils'

export function useAdminImageUpload(category) {
  const pendingRef = useRef([])
  const savedUrlRef = useRef('')

  const setPending = (next) => {
    pendingRef.current = next
  }

  const initCreate = () => {
    savedUrlRef.current = ''
    setPending([])
  }

  const initEdit = (url) => {
    savedUrlRef.current = url || ''
    setPending([])
  }

  const discardPending = async () => {
    const urls = pendingRef.current
    if (urls.length === 0) return

    await Promise.all(urls.map((url) => api.deleteUploadedImage(url).catch(() => {})))
    setPending([])
  }

  const removePending = async (url) => {
    if (!url || !pendingRef.current.includes(url)) return

    await api.deleteUploadedImage(url).catch(() => {})
    setPending(pendingRef.current.filter((item) => item !== url))
  }

  const trackUpload = (url) => {
    if (!url || pendingRef.current.includes(url)) return
    setPending([...pendingRef.current, url])
  }

  const handleChange = async (prevUrl, nextUrl, applyNext) => {
    if (prevUrl && prevUrl !== nextUrl && pendingRef.current.includes(prevUrl)) {
      await removePending(prevUrl)
    }

    applyNext(nextUrl)

    if (nextUrl) {
      trackUpload(nextUrl)
    }
  }

  const handleRemove = async (url, applyEmpty) => {
    if (url && pendingRef.current.includes(url)) {
      await removePending(url)
    }
    applyEmpty()
  }

  const finalizeSave = async (nextUrl, entityId) => {
    const savedUrl = savedUrlRef.current
    if (savedUrl && savedUrl !== nextUrl && isManagedImage(savedUrl, category)) {
      await api.deleteUploadedImage(savedUrl, { type: entityType(category), id: entityId }).catch(() => {})
    }
    setPending([])
  }

  const deleteSavedOnEntityDelete = async (url) => {
    if (!isManagedImage(url, category)) return
    await api.deleteUploadedImage(url).catch(() => {})
  }

  return {
    initCreate,
    initEdit,
    discardPending,
    handleChange,
    handleRemove,
    finalizeSave,
    deleteSavedOnEntityDelete,
  }
}

export function useAdminGalleryUpload() {
  const pendingRef = useRef([])
  const savedImagesRef = useRef([])

  const setPending = (next) => {
    pendingRef.current = next
  }

  const initCreate = () => {
    savedImagesRef.current = []
    setPending([])
  }

  const initEdit = (images) => {
    savedImagesRef.current = Array.isArray(images) ? [...images] : []
    setPending([])
  }

  const discardPending = async () => {
    const urls = pendingRef.current
    if (urls.length === 0) return

    await Promise.all(urls.map((url) => api.deleteUploadedImage(url).catch(() => {})))
    setPending([])
  }

  const removePending = async (url) => {
    if (!url || !pendingRef.current.includes(url)) return

    await api.deleteUploadedImage(url).catch(() => {})
    setPending(pendingRef.current.filter((item) => item !== url))
  }

  const trackUpload = (url) => {
    if (!url || pendingRef.current.includes(url)) return
    setPending([...pendingRef.current, url])
  }

  const addImage = async (images, url, applyImages) => {
    trackUpload(url)
    applyImages([...images, url])
  }

  const removeImage = async (images, url, applyImages) => {
    if (pendingRef.current.includes(url)) {
      await removePending(url)
    }
    applyImages(images.filter((item) => item !== url))
  }

  const finalizeSave = async (nextImages, productId) => {
    const removed = savedImagesRef.current.filter((url) => !nextImages.includes(url))
    await Promise.all(
      removed.map((url) =>
        api.deleteUploadedImage(url, { type: 'product', id: productId }).catch(() => {}),
      ),
    )
    setPending([])
  }

  const deleteAllSaved = async (images) => {
    await Promise.all(
      images.map((url) => api.deleteUploadedImage(url).catch(() => {})),
    )
  }

  return {
    initCreate,
    initEdit,
    discardPending,
    addImage,
    removeImage,
    finalizeSave,
    deleteAllSaved,
  }
}

function entityType(category) {
  if (category === 'news') return 'news'
  if (category === 'seasons') return 'season'
  if (category === 'collections') return 'collection'
  if (category === 'categories') return 'category'
  return 'product'
}

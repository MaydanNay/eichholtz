export default function AdminTableThumb({ url, alt = '' }) {
  if (!url) {
    return <span className="admin-table__thumb admin-table__thumb--empty">—</span>
  }

  return (
    <img
      src={url}
      alt={alt}
      className="admin-table__thumb"
      loading="lazy"
    />
  )
}

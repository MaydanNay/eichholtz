import AdminSearchToggle from './AdminSearchToggle'

export default function AdminPageHeader({ title, hint, children }) {
  return (
    <div className="admin-page__header">
      <div>
        <h1>{title}</h1>
        {hint && <p className="admin-page__hint">{hint}</p>}
      </div>

      <div className="admin-page__actions">
        <AdminSearchToggle />
        {children}
      </div>
    </div>
  )
}

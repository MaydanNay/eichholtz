import { createContext, useContext } from 'react'

const AdminSearchContext = createContext({
  query: '',
  setQuery: () => {},
})

export function AdminSearchProvider({ value, children }) {
  return (
    <AdminSearchContext.Provider value={value}>
      {children}
    </AdminSearchContext.Provider>
  )
}

export function useAdminSearch() {
  return useContext(AdminSearchContext)
}

export function matchesAdminSearch(query, ...values) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true

  return values.some((value) =>
    String(value ?? '').toLowerCase().includes(normalized),
  )
}

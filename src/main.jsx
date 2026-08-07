import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import App from './App.jsx'
import AdminLogin from './admin/AdminLogin.jsx'
import AdminLayout from './admin/AdminLayout.jsx'
import AdminHomePage from './admin/AdminHomePage.jsx'
import ProtectedRoute from './admin/ProtectedRoute.jsx'

import CrmPage from './admin/CrmPage.jsx'
import UsersPage from './admin/UsersPage.jsx'
import NewsPage from './admin/NewsPage.jsx'
import ContactsSettingsPage from './admin/ContactsSettingsPage.jsx'
import CollectionsHubPage from './admin/CollectionsHubPage.jsx'
import CollectionDetailsPage from './admin/CollectionDetailsPage.jsx'
import CatalogsPage from './admin/CatalogsPage.jsx'
import ProductsHubPage from './admin/ProductsHubPage.jsx'
import { isLoggedIn } from './admin/api.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
        <BrowserRouter>
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/designers" element={<App />} />
        <Route path="/catalogues" element={<App />} />
        <Route path="/catalog" element={<App />} />
        <Route path="/collections" element={<App />} />
        <Route path="/events" element={<App />} />
        <Route path="/about" element={<App />} />
        <Route path="/contract" element={<App />} />
        <Route path="/contract/hospitality" element={<App />} />
        <Route path="/contract/branded-residences" element={<App />} />
        <Route path="/contacts" element={<App />} />
        <Route path="/account" element={<App />} />
        <Route path="/tproduct/:productSlug" element={<App />} />
        <Route path="/category/:categorySlug" element={<App />} />
        <Route path="/collection/:collectionSlug" element={<App />} />
        <Route path="/catalog/:collectionSlug" element={<App />} />
        <Route path="/news/:id" element={<App />} />
        <Route
          path="/admin/login"
          element={isLoggedIn() ? <Navigate to="/admin/products" replace /> : <AdminLogin />}
        />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/home" replace />} />
            <Route path="home" element={<AdminHomePage />} />
            <Route path="collections" element={<CollectionsHubPage />} />
            <Route path="collections/:id" element={<CollectionDetailsPage />} />
            <Route path="catalogs" element={<CatalogsPage />} />
            <Route path="products" element={<ProductsHubPage />} />
            <Route path="crm" element={<CrmPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="contacts" element={<ContactsSettingsPage />} />
          </Route>
        </Route>
      </Routes>
      </BrowserRouter>
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  </StrictMode>,
)

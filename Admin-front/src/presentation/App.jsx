import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedPage } from './components/ProtectedPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardAdminPage } from './pages/DashboardAdminPage';
import { ProductsAdminPage } from './pages/ProductsAdminPage';
import { PricesAdminPage } from './pages/PricesAdminPage';
import { UsersPage } from './pages/UsersPage';
import { QuotesAdminPage } from './pages/QuotesAdminPage';
import { CobranzaPage } from './pages/CobranzaPage';

export function App() {
  const pages = [
    ['/dashboard', { permission: 'dashboard' }, <DashboardAdminPage />],
    ['/productos', { permission: 'productos' }, <ProductsAdminPage />],
    ['/precios', { permission: 'consulta_precios' }, <PricesAdminPage />],
    ['/usuarios', { permission: 'usuarios', roles: ['admin'] }, <UsersPage />],
    ['/cotizaciones', { permission: 'cotizaciones' }, <QuotesAdminPage />],
    ['/cobranza', { permission: 'cotizaciones' }, <CobranzaPage />],
  ];
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    {pages.map(([path, route, page]) => <Route key={path} path={path} element={
      <ProtectedPage route={route}>{page}</ProtectedPage>
    } />)}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
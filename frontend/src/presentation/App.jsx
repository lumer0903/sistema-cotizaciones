import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedPage } from './components/ProtectedPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { PricesPage } from './pages/PricesPage';
import { ImportProductsPage } from './pages/ImportProductsPage';
import { QuotesPage } from './pages/QuotesPage';
import { CreateQuotePage } from './pages/CreateQuotePage';
import { QuoteDetailPage } from './pages/QuoteDetailPage';
import { UsersPage } from './pages/UsersPage';

export function App() {
  const pages = [
    ['/dashboard', { permission: 'dashboard' }, <DashboardPage />],
    ['/productos', { permission: 'productos' }, <ProductsPage />],
    ['/importar-productos', { permission: 'importacion' }, <ImportProductsPage />],
    ['/consulta-precios', { permission: 'consulta_precios' }, <PricesPage />],
    ['/cotizaciones', { permission: 'cotizaciones' }, <QuotesPage />],
    ['/crear-cotizacion', { permission: 'cotizaciones' }, <CreateQuotePage />],
    ['/cotizacion-detalle', { permission: 'cotizaciones' }, <QuoteDetailPage />],
    ['/usuarios', { permission: 'usuarios', roles: ['admin', 'gerente'] }, <UsersPage />]
  ];
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    {pages.map(([path, route, page]) => <Route key={path} path={path} element={
      <ProtectedPage route={route}>{page}</ProtectedPage>
    } />)}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedPage } from './components/ProtectedPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { PricesPage } from './pages/PricesPage';
import { QuotesPage } from './pages/QuotesPage';
import { CreateQuotePage } from './pages/CreateQuotePage';
import { QuoteDetailPage } from './pages/QuoteDetailPage';
import { VentasPage } from './pages/VentasPage';
import { CreateVentaPage } from './pages/CreateVentaPage';

export function App() {
  const pages = [
    ['/dashboard', { permission: 'dashboard' }, <DashboardPage />],
    ['/productos', { permission: 'productos' }, <ProductsPage />],
    ['/consulta-precios', { permission: 'consulta_precios' }, <PricesPage />],
    ['/cotizaciones', { permission: 'cotizaciones' }, <QuotesPage />],
    ['/crear-cotizacion', { permission: 'cotizaciones' }, <CreateQuotePage />],
    ['/cotizacion-detalle', { permission: 'cotizaciones' }, <QuoteDetailPage />],
    ['/ventas', { permission: 'cotizaciones' }, <VentasPage />],
    ['/crear-venta', { permission: 'cotizaciones' }, <CreateVentaPage />],
  ];
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    {pages.map(([path, route, page]) => <Route key={path} path={path} element={
      <ProtectedPage route={route}>{page}</ProtectedPage>
    } />)}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
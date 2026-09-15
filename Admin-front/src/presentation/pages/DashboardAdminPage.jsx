import { useCallback, useEffect, useState } from 'react';
import { BadgeDollarSign, CheckCircle2, FileText, Package, PieChart, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { money } from '../utils/format';

const states = {
  borrador: ['Borrador', '#a1a1aa'],
  enviada: ['Enviado', '#3b82f6'],
  aprobada: ['Aprobado', '#10b981'],
  rechazada: ['Rechazado', '#ef4444']
};

export function DashboardAdminPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true); setError('');
    try { setData(await apiJson('/api/dashboard/resumen')); setUpdatedAt(new Date()); }
    catch (requestError) { setError(requestError.message); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const metrics = data?.metricas || {};
  const cards = [
    [Package, 'Total productos', data ? metrics.totalProductos : '...', 'bg-[#f8fafc] text-[#414141] border border-[#d9d9d9]', '/productos'],
    [Users, 'Total usuarios', data ? metrics.totalUsuarios : '...', 'bg-[#f8fafc] text-[#414141] border border-[#d9d9d9]', '/usuarios'],
    [FileText, 'Total cotizaciones', data ? metrics.totalCotizaciones : '...', 'bg-[#f8fafc] text-[#414141] border border-[#d9d9d9]', '/cotizaciones'],
    [BadgeDollarSign, 'Ventas globales mes', data ? money(metrics.totalVentasMes) : '...', 'bg-[#f8fafc] text-[#414141] border border-[#d9d9d9]', '/cotizaciones?estado=aprobada']
  ];
  
  const sales = data?.ventasPorMes || [];
  const maxSales = Math.max(...sales.map(item => Number(item.total)), 1);

  const rows = data?.cotizacionesPorEstado || [];
  const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  let cursor = 0;
  const gradient = rows.map(row => {
    const start = cursor;
    cursor += total ? Number(row.total) / total * 100 : 0;
    return `${states[row.estado]?.[1] || '#d9d9d9'} ${start}% ${cursor}%`;
  }).join(', ');

  return (
    <AppLayout title="Dashboard Administrativo">
      <div className="space-y-8 select-none">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-xs font-semibold text-red-650 animate-in">
            {error}
          </div>
        )}

        {/* Grid de Tarjetas de Métricas */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([Icon, label, value, style, href]) => (
            <Link 
              key={label}
              to={href}
              className="group block rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs hover:border-[#7b1c1c] hover:shadow-sm transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  {label}
                </span>
                <div className="rounded-lg p-2 bg-[#f8fafc] group-hover:bg-[#fdf2f2] transition-colors">
                  <Icon className="h-4 w-4 text-[#414141]" />
                </div>
              </div>
              <div className="mt-4">
                <strong className="text-2xl font-bold tracking-tight text-[#414141]">
                  {value}
                </strong>
              </div>
            </Link>
          ))}
        </section>

        {/* Panel de Gráficos y Estadísticas */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Gráfico de Ventas (Bar Chart) */}
          <article className="lg:col-span-2 rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[#414141]">Ventas globales por mes</h3>
                <p className="text-[11px] text-neutral-400">Historial mensual acumulado de todas las ventas aprobadas</p>
              </div>
              <TrendingUp className="h-4 w-4 text-[#414141]" />
            </div>
            <div className="flex h-56 items-end justify-around gap-2 px-2 pt-2">
              {(data?.ventasPorMes || [{ mes: 'Actual', total: 0 }]).map(row => (
                <div className="flex flex-col items-center gap-2 flex-1 group" key={row.mes}>
                  <span className="text-[9px] font-semibold text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {money(row.total)}
                  </span>
                  <div className="w-full bg-[#f8fafc] rounded-t-md flex items-end h-32">
                    <div 
                      className="w-full rounded-t-md bg-[#7b1c1c] group-hover:bg-[#601414] transition-all" 
                      style={{ height: `${Math.max(6, (Number(row.total) / maxSales) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-neutral-405">
                    {row.mes}
                  </span>
                </div>
              ))}
            </div>
          </article>

          {/* Gráfico de Estados (Donut Chart) */}
          <article className="rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-4 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[#414141]">Distribución global</h3>
                <p className="text-[11px] text-neutral-400">Estados de todas las cotizaciones</p>
              </div>
              <PieChart className="h-4 w-4 text-[#414141]" />
            </div>

            <div className="flex-1 flex flex-col justify-center py-4">
              <div 
                className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full shadow-inner relative"
                style={{ 
                  background: gradient 
                    ? `conic-gradient(${gradient})` 
                    : '#f8fafc',
                  padding: '24px'
                }}
              >
                <div className="absolute inset-5 rounded-full bg-white flex flex-col items-center justify-center shadow-xs">
                  <span className="text-xl font-bold tracking-tight text-[#414141]">{total}</span>
                  <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">Total</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#d9d9d9] pt-4 mt-6 grid grid-cols-2 gap-2">
              {rows.map(row => (
                <div className="flex items-center justify-between text-xs px-1.5 py-1 rounded-lg hover:bg-[#f8fafc]" key={row.estado}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: states[row.estado]?.[1] }}
                    />
                    <span className="truncate text-[#414141]/80">
                      {states[row.estado]?.[0] || row.estado}
                    </span>
                  </div>
                  <span className="font-semibold text-[#414141]">
                    {total ? Math.round((Number(row.total) / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Actividad Reciente y Alertas */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Últimas Cotizaciones Globales */}
          <article className="rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#414141]">Últimas cotizaciones (Global)</h3>
                <p className="text-[11px] text-neutral-400">Actividad reciente de todos los vendedores</p>
              </div>
              <FileText className="h-4 w-4 text-[#414141]/60" />
            </div>

            <ul className="divide-y divide-[#d9d9d9]/40 flex-1 min-h-[220px]">
              {data?.ultimasCotizaciones?.length ? (
                data.ultimasCotizaciones.map(quote => (
                  <li className="flex items-center justify-between py-3 text-xs" key={quote.id_cotizacion}>
                    <Link 
                      to={`/cotizaciones?id=${quote.id_cotizacion}`}
                      className="flex flex-col min-w-0 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold text-[#414141]">{quote.numero}</span>
                      <span className="truncate text-neutral-400 text-[10px] mt-0.5">
                        {quote.cliente_nombre || 'Sin cliente'} - {quote.vendedor_nombre || 'Sin vendedor'}
                      </span>
                    </Link>
                    <span className="shrink-0 font-semibold text-[#414141]">
                      {money(quote.total)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="h-full flex items-center justify-center text-xs text-neutral-400 py-12">
                  No se registraron cotizaciones recientes.
                </li>
              )}
            </ul>
          </article>

          {/* Usuarios recientes / Productos bajo stock */}
          <article className="rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#d9d9d9] pb-4 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[#414141]">Inventario en alerta</h3>
                <p className="text-[11px] text-neutral-400">Productos con stock bajo el límite</p>
              </div>
              <Package className="h-4 w-4 text-amber-500" />
            </div>

            <ul className="divide-y divide-[#d9d9d9]/40 flex-1 min-h-[220px]">
              {data?.bajoStock?.length ? (
                data.bajoStock.map(product => (
                  <li className="flex items-center justify-between py-3 text-xs" key={product.id_producto}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-semibold text-[#414141] shrink-0">{product.codigo}</span>
                      <span className="truncate text-neutral-450">{product.descripcion}</span>
                    </div>
                    <span className="shrink-0 rounded-md bg-[#7b1c1c]/5 px-2 py-1 text-[10px] font-bold text-[#7b1c1c] border border-[#7b1c1c]/10">
                      {product.stock_total} unidades
                    </span>
                  </li>
                ))
              ) : (
                <li className="h-full flex items-center justify-center text-xs text-neutral-400 py-12">
                  No hay productos en alerta de inventario.
                </li>
              )}
            </ul>
          </article>
        </section>
      </div>
    </AppLayout>
  );
}
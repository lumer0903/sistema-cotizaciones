import { useCallback, useEffect, useState } from 'react';
import { Eye, Search, AlertCircle, ArrowRight, FileText, DollarSign, Filter, MoreHorizontal } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { date, money } from '../utils/format';
import { PagoModal } from '../components/PagoModal';

const estadoStyles = {
  pendiente: 'bg-yellow-50 text-yellow-700 border-yellow-100/50',
  parcial: 'bg-blue-50 text-blue-700 border-blue-100/50',
  pagada: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  vencida: 'bg-red-50 text-red-650 border-red-100/50',
  castigada: 'bg-neutral-100 text-neutral-600 border-neutral-200/50'
};

const estadoNames = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
  castigada: 'Castigada'
};

export function CobranzaPage() {
  const [cuentas, setCuentas] = useState([]);
  const [query, setQuery] = useState('');
  const [estado, setEstado] = useState('todos');
  const [soloVencidas, setSoloVencidas] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagoModal, setPagoModal] = useState({ open: false, cuenta: null });
  const [resumen, setResumen] = useState(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (estado !== 'todos') params.set('estado', estado);
    if (soloVencidas) params.set('vencidas', 'true');
    params.set('page', page);
    params.set('limit', '20');

    setLoading(true);
    try {
      const data = await apiJson(`/api/cuentas-cobrar?${params}`);
      setCuentas(data.cuentas || []);
      setTotalPages(data.totalPages || 1);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [query, estado, soloVencidas, page]);

  const loadResumen = useCallback(async () => {
    try {
      const data = await apiJson('/api/cuentas-cobrar/resumen');
      setResumen(data);
    } catch (requestError) {
      console.error('Error loading resumen:', requestError);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadResumen(); }, [loadResumen]);

  const handlePago = (cuenta) => {
    setPagoModal({ open: true, cuenta });
  };

  const handlePagoSuccess = () => {
    setPagoModal({ open: false, cuenta: null });
    load();
    loadResumen();
  };

  const getDiasAtraso = (fechaVencimiento, estado) => {
    if (estado === 'pagada') return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento);
    venc.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((hoy - venc) / (1000 * 60 * 60 * 24)));
  };

  const formatMonto = (monto) => money(monto);

  const kpis = resumen ? [
    ['Total Pendiente', formatMonto(resumen.totalPendiente), DollarSign, '#7b1c1c'],
    ['Total Vencido', formatMonto(resumen.totalVencido), AlertCircle, '#ef4444'],
    ['Cartera Vencida %', `${resumen.carteraVencidaPct}%`, FileText, resumen.carteraVencidaPct > 10 ? '#ef4444' : '#10b981'],
    ['Cuentas Pendientes', resumen.cuentasPendientes, DollarSign, '#3b82f6']
  ] : [];

  return (
    <AppLayout title="Cobranza - Cuentas por Cobrar">
      <div className="space-y-8 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {/* KPIs Cards */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(([label, value, Icon, color]) => (
            <article key={label} className="rounded-2xl border border-[#d9d9d9] bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  {label}
                </span>
                <div className="rounded-lg p-2 bg-[#f8fafc]">
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
              </div>
              <div className="mt-4">
                <strong className="text-2xl font-bold tracking-tight text-[#414141]" style={{ color }}>
                  {value}
                </strong>
              </div>
            </article>
          ))}
        </section>

        {/* Filtros y Tabla */}
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border border-[#d9d9d9] bg-white p-5 rounded-2xl shadow-xs">
            <div className="flex flex-wrap gap-4 items-center flex-1">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Buscar cliente, venta..."
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>

              {/* Estado */}
              <div className="relative">
                <select
                  value={estado}
                  onChange={event => { setEstado(event.target.value); setPage(1); }}
                  className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
                >
                  <option value="todos">Todos los estados</option>
                  {Object.entries(estadoNames).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                  <Filter className="h-3 w-3" />
                </div>
              </div>

              {/* Solo vencidas */}
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloVencidas}
                  onChange={event => { setSoloVencidas(event.target.checked); setPage(1); }}
                  className="rounded border-[#d9d9d9] text-[#7b1c1c] focus:ring-[#7b1c1c]"
                />
                <span className="text-xs font-medium text-[#414141]">Solo vencidas</span>
              </label>
            </div>
          </div>

          {/* Tabla de Cuentas por Cobrar */}
          <div className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-xs">
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[100px]">Venta</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Cliente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Vencimiento</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Original</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Pendiente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[80px]">Días Atraso</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Estado</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d9d9d9]/40">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-xs text-neutral-400">
                        Cargando cuentas por cobrar...
                      </td>
                    </tr>
                  ) : cuentas.length ? (
                    cuentas.map(cuenta => {
                      const diasAtraso = getDiasAtraso(cuenta.fechaVencimiento, cuenta.estado);
                      const isVencida = diasAtraso > 0 && cuenta.estado !== 'pagada';
                      
                      return (
                        <tr key={cuenta.id_cuenta} className={isVencida ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-[#f8fafc]/50'} style={{ transition: 'all 150ms' }}>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-xs text-[#414141]">
                              {cuenta.venta?.numero_completo || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-neutral-500 font-medium">
                              {cuenta.cliente?.nombre || 'Sin cliente'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={isVencida ? 'text-xs font-semibold text-red-650' : 'text-xs text-neutral-400'}>
                              {date(cuenta.fechaVencimiento)}
                              {isVencida && <AlertCircle className="inline h-3 w-3 ml-1" />}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-[#414141]">
                              {formatMonto(cuenta.montoOriginal)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-[#414141]">
                              {formatMonto(cuenta.montoPendiente)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={diasAtraso > 0 ? 'text-xs font-semibold text-red-650' : 'text-xs text-neutral-400'}>
                              {diasAtraso} {diasAtraso === 1 ? 'día' : 'días'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`
                              inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border
                              ${estadoStyles[cuenta.estado] || 'bg-neutral-100 text-neutral-600'}
                            `}>
                              {estadoNames[cuenta.estado] || cuenta.estado}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {cuenta.estado !== 'pagada' && (
                              <button
                                onClick={() => handlePago(cuenta)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#7b1c1c] bg-[#7b1c1c] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#601414] shadow-2xs transition-all"
                              >
                                <DollarSign className="h-3 w-3" />
                                <span>Pagar</span>
                              </button>
                            )}
                            {cuenta.estado === 'pagada' && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1.5 text-[10px] font-semibold border border-emerald-100">
                                Pagada
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-xs text-neutral-400">
                        No se encontraron cuentas por cobrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="border-t border-[#d9d9d9] px-6 py-4 bg-[#f8fafc]/50 flex items-center justify-between text-xs text-neutral-400">
                <span>Página {page} de {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-[#d9d9d9] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-[#d9d9d9] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-all"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal de Pago */}
        {pagoModal.open && pagoModal.cuenta && (
          <PagoModal
            cuenta={pagoModal.cuenta}
            onClose={() => setPagoModal({ open: false, cuenta: null })}
            onSuccess={handlePagoSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
}
import { useCallback, useEffect, useState } from 'react';
import { FileText, Search, ChevronDown, DollarSign, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { date, money } from '../utils/format';

const stateNames = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada', emitida: 'Emitida', pagada: 'Pagada', parcial: 'Parcial', anulada: 'Anulada', devuelta: 'Devuelta' };
const stateStyles = {
  borrador: 'bg-neutral-100 text-[#414141] border-[#d9d9d9]/50',
  enviada: 'bg-blue-50 text-blue-700 border-blue-100/50',
  aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  rechazada: 'bg-red-50 text-red-650 border-red-100/50',
  emitida: 'bg-blue-50 text-blue-700 border-blue-100/50',
  pagada: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  parcial: 'bg-yellow-50 text-yellow-700 border-yellow-100/50',
  anulada: 'bg-neutral-100 text-neutral-600 border-neutral-200/50',
  devuelta: 'bg-orange-50 text-orange-700 border-orange-100/50'
};

const tipoPagoNames = { contado: 'Contado', credito: 'Crédito' };
const tipoPagoStyles = { contado: 'bg-emerald-50 text-emerald-700 border-emerald-100/50', credito: 'bg-blue-50 text-blue-700 border-blue-100/50' };

export function VentasPage() {
  const [ventas, setVentas] = useState([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState('todos');
  const [tipoPagoFilter, setTipoPagoFilter] = useState('todos');
  const [day, setDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (state !== 'todos') params.set('estado', state);
    if (tipoPagoFilter !== 'todos') params.set('tipoPago', tipoPagoFilter);
    if (day) params.set('fecha', day);

    setLoading(true);
    apiJson(`/api/ventas?${params}`)
      .then(setVentas)
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [query, state, tipoPagoFilter, day]);

  useEffect(load, [load]);

  return (
    <AppLayout title="Mis Ventas">
      <div className="space-y-6 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {/* Header con botón crear */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-[#414141] tracking-tight">Historial de Ventas</h2>
            <p className="text-xs text-neutral-450 mt-1">Todas las ventas registradas</p>
          </div>
          <Link
            to="/crear-venta"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] transition-all shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Nueva venta</span>
          </Link>
        </div>

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
                placeholder="Buscar venta, cliente..."
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            {/* Fecha */}
            <div className="relative">
              <input
                type="date"
                value={day}
                onChange={event => setDay(event.target.value)}
                className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs text-[#414141] focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            {/* Estado */}
            <div className="relative">
              <select
                value={state}
                onChange={event => setState(event.target.value)}
                className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
              >
                <option value="todos">Todos los estados</option>
                {Object.entries(stateNames).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>

            {/* Tipo Pago */}
            <div className="relative">
              <select
                value={tipoPagoFilter}
                onChange={event => setTipoPagoFilter(event.target.value)}
                className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
              >
                <option value="todos">Todos los tipos</option>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                <DollarSign className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Ventas */}
        <div className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[140px]">Número</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[140px]">Fecha</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[100px]">Tipo Pago</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[125px]">Monto</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Estado</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9d9d9]/40">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-xs text-neutral-400">
                      Cargando lista de ventas...
                    </td>
                  </tr>
                ) : ventas.length ? (
                  ventas.map(venta => (
                    <tr key={venta.id_venta} className="hover:bg-[#f8fafc]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-xs text-[#414141] group-hover:text-black">
                          {venta.numero_completo}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-500 font-medium">
                          {venta.cliente?.nombre || 'Sin cliente'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-400">
                          {date(venta.fecha_emision)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border
                          ${tipoPagoStyles[venta.tipoPago] || 'bg-neutral-100 text-neutral-600'}
                        `}>
                          {tipoPagoNames[venta.tipoPago] || venta.tipoPago}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-[#414141]">
                          {money(venta.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border
                          ${stateStyles[venta.estado] || 'bg-neutral-100 text-neutral-600'}
                        `}>
                          {stateNames[venta.estado] || venta.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/venta-detalle?id=${venta.id_venta}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                        >
                          <FileText className="h-3 w-3 text-neutral-400" />
                          <span>Ver</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-xs text-neutral-400">
                      No se encontraron ventas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#d9d9d9] px-6 py-4 bg-[#f8fafc]/50 flex items-center justify-between text-xs text-neutral-400">
            <span>{ventas.length} ventas registradas</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
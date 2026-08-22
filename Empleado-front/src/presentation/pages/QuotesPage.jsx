import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Edit3, Eye, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { date, money } from '../utils/format';

const stateNames = { borrador: 'Borrador', enviada: 'Enviada', aprobada: 'Aprobada', rechazada: 'Rechazada' };
const stateStyles = {
  borrador: 'bg-neutral-100 text-[#414141] border-[#d9d9d9]/50',
  enviada: 'bg-blue-50 text-blue-700 border-blue-100/50',
  aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
  rechazada: 'bg-red-50 text-red-650 border-red-100/50'
};

export function QuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [query, setQuery] = useState('');
  const [state, setState] = useState('todos');
  const [day, setDay] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (state !== 'todos') params.set('estado', state);
    if (day) params.set('fecha', day);

    setLoading(true);
    apiJson(`/api/cotizaciones?${params}`)
      .then(setQuotes)
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [query, state, day]);

  useEffect(load, [load]);

  return (
    <AppLayout title="Cotizaciones">
      <div className="space-y-6 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {/* Barra de Filtros y Acciones */}
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
                placeholder="Buscar cotización..."
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
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Nueva Cotización */}
          <Link
            to="/crear-cotizacion"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7b1c1c] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#601414] shadow-xs hover:shadow-sm transition-all duration-150"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva cotización</span>
          </Link>
        </div>

        {/* Tabla de Cotizaciones */}
        <div className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Número</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Cliente</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[140px]">Fecha</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Tarifa</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[125px]">Monto</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Estado</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[120px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9d9d9]/40">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-xs text-neutral-400">
                      Cargando lista de cotizaciones...
                    </td>
                  </tr>
                ) : quotes.length ? (
                  quotes.map(quote => (
                    <tr key={quote.id_cotizacion} className="hover:bg-[#f8fafc]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-xs text-[#414141] group-hover:text-black">
                          {quote.numero}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-500 font-medium">
                          {quote.cliente_nombre || 'Sin cliente especificado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-neutral-400">
                          {date(quote.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase
                          ${quote.tipo_precio === 'distribuidor' 
                            ? 'bg-[#fdf2f2] text-[#7b1c1c]' 
                            : 'bg-[#f8fafc] text-neutral-500'}
                        `}>
                          {quote.tipo_precio === 'distribuidor' ? 'Mayorista' : 'Tienda'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-semibold text-[#414141]">
                          {money(quote.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`
                          inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border
                          ${stateStyles[quote.estado] || 'bg-neutral-100 text-neutral-600'}
                        `}>
                          {stateNames[quote.estado] || quote.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {quote.estado === 'borrador' ? (
                          <Link
                            to={`/cotizacion-detalle?id=${quote.id_cotizacion}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                          >
                            <Edit3 className="h-3 w-3 text-neutral-400" />
                            <span>Editar</span>
                          </Link>
                        ) : (
                          <Link
                            to={`/cotizacion-detalle?id=${quote.id_cotizacion}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                          >
                            <Eye className="h-3 w-3 text-neutral-400" />
                            <span>Ver</span>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-xs text-neutral-400">
                      No se encontraron cotizaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#d9d9d9] px-6 py-4 bg-[#f8fafc]/50 flex items-center justify-between text-xs text-neutral-400">
            <span>{quotes.length} cotizaciones registradas</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

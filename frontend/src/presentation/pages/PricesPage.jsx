import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, History, Search } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { authSession } from '../../application/auth/authSession';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { ProductImage } from '../components/ProductImage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { date, money } from '../utils/format';

const fields = {
  precio_unidad_normal: 'Precio Unidad Tienda',
  precio_docena_normal: 'Precio Docena Tienda',
  precio_mayor_normal: 'Precio Mayor Tienda',
  precio_unidad_dist: 'Precio Unidad Mayorista',
  precio_docena_dist: 'Precio Docena Mayorista',
  precio_mayor_dist: 'Precio Mayor Mayorista',
  costo_distribuidor: 'Costo Mayorista',
  costo_tienda: 'Costo Tienda',
  costo_normal: 'Costo Tienda',
  stock_total: 'Stock Total',
  stock_minimo: 'Stock Mínimo'
};

function PriceTier({ product, wholesale = false }) {
  const suffix = wholesale ? 'dist' : 'normal';
  return (
    <div className={`p-5 space-y-3 ${wholesale ? 'bg-[#f8fafc]' : 'bg-white'}`}>
      <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase block">
        Tarifa {wholesale ? 'Mayorista' : 'Tienda'}
      </span>
      <div className="grid grid-cols-3 gap-3">
        {[
          ['Unidad', 'unidad'],
          ['Docena', 'docena'],
          ['Mayor', 'mayor']
        ].map(([label, type]) => (
          <div className="flex flex-col gap-0.5" key={type}>
            <span className="text-[10px] text-neutral-400 font-medium">{label}</span>
            <strong className="text-xs font-bold text-[#414141]">
              {money(product[`precio_${type}_${suffix}`])}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricesPage() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('todos');
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const debounced = useDebouncedValue(query, 250);
  const privileged = ['admin', 'gerente'].includes(authSession.user()?.rol);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced.trim()) params.set('q', debounced.trim());
    setLoading(true);
    apiJson(`/api/productos?${params}`)
      .then(setProducts)
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(load, [load]);

  async function openHistory(product) {
    setHistory({ product, rows: null });
    try {
      const data = await apiJson(`/api/productos/${product.id_producto}/historial`);
      setHistory({ product, rows: data.historial });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <AppLayout title="Consulta de precios">
      <div className="space-y-6 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-[#d9d9d9] bg-white p-5 rounded-2xl shadow-xs">
          <div className="flex flex-wrap gap-4 items-center flex-1">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar por código..."
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            {/* Tipo de Precio */}
            <div className="relative">
              <select
                value={type}
                onChange={event => setType(event.target.value)}
                className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
              >
                <option value="todos">Todos los precios</option>
                <option value="tienda">Solo Tienda</option>
                <option value="distribuidor">Solo Mayorista</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Grid de Precios */}
        {loading ? (
          <div className="text-center text-xs text-neutral-400 py-12">
            Cargando tarifas y stock del catálogo...
          </div>
        ) : products.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map(product => {
              const isLowStock = Number(product.stock_total) <= Number(product.stock_minimo || 10);
              return (
                <article 
                  className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between" 
                  key={product.id_producto}
                >
                  {/* Encabezado de Tarjeta */}
                  <div className="flex items-start gap-4 p-5">
                    <div className="h-14 w-14 rounded-xl overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] flex items-center justify-center shrink-0">
                      <ProductImage product={product} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#414141] tracking-tight">{product.codigo}</h3>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{product.descripcion}</p>
                      
                      <div className="flex items-center gap-1.5 mt-2.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        <span className="text-[10px] font-bold text-neutral-500 tracking-wide uppercase">
                          Stock: {product.stock_total || 0} un.
                        </span>
                      </div>
                    </div>
                    {privileged && (
                      <button 
                        onClick={() => openHistory(product)}
                        className="rounded-lg p-2 text-neutral-400 hover:text-[#7b1c1c] hover:bg-[#fdf2f2] transition-colors"
                        aria-label={`Historial de ${product.codigo}`}
                      >
                        <History className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Niveles de Tarifa */}
                  <div className="border-t border-[#d9d9d9] divide-y divide-[#d9d9d9]/40 bg-[#f8fafc]">
                    {['todos', 'tienda'].includes(type) && <PriceTier product={product} />}
                    {['todos', 'distribuidor'].includes(type) && <PriceTier product={product} wholesale />}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-xs text-neutral-400 py-12">
            No se encontraron productos registrados en el catálogo.
          </div>
        )}
      </div>

      {/* Modal Historial de Precios */}
      <Modal 
        open={Boolean(history)} 
        title={`Historial de Auditoría: ${history?.product?.codigo || ''}`} 
        onClose={() => setHistory(null)}
        className="max-w-3xl"
      >
        <div className="overflow-hidden rounded-xl border border-[#d9d9d9] bg-white">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Fecha</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Parámetro</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Anterior</th>
                  <th className="px-5 py-3.5 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Nuevo</th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Variación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9d9d9]/40">
                {history?.rows === null ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-neutral-400">
                      Cargando registros de cambios...
                    </td>
                  </tr>
                ) : history?.rows?.length ? (
                  history.rows.map((row, index) => {
                    const diff = Number(row.valor_nuevo) - Number(row.valor_anterior);
                    const isPositive = diff > 0;
                    return (
                      <tr key={index} className="hover:bg-[#f8fafc]/50 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-[#414141]">
                          {date(row.fecha_cambio)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#414141]/80 font-medium">
                          {fields[row.campo_modificado] || row.campo_modificado}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-neutral-500">
                          {money(row.valor_anterior)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#414141] font-semibold">
                          {money(row.valor_nuevo)}
                        </td>
                        <td className={`px-5 py-3.5 text-xs font-semibold text-right ${isPositive ? 'text-emerald-600' : diff < 0 ? 'text-red-655' : 'text-[#414141]/60'}`}>
                          {isPositive ? '+' : ''}{money(diff)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-xs text-neutral-400">
                      Sin cambios registrados para este producto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { ProductImage } from '../components/ProductImage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { money } from '../utils/format';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const debounced = useDebouncedValue(query, 250);

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

  return (
    <AppLayout title="Consulta de Precios">
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
    </AppLayout>
  );
}
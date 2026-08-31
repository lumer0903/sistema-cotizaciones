import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { apiJson } from '../../infrastructure/http/apiClient';
import { AppLayout } from '../components/AppLayout';
import { ProductImage } from '../components/ProductImage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const debounced = useDebouncedValue(query);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (debounced.trim()) params.set('q', debounced.trim());
    if (category) params.set('categoria', category);
    setLoading(true);
    apiJson(`/api/productos?${params}`)
      .then(setProducts)
      .catch(requestError => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [debounced, category]);

  useEffect(() => {
    apiJson('/api/productos/categorias')
      .then(setCategories)
      .catch(requestError => setError(requestError.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AppLayout title="Catálogo de Productos">
      <div className="space-y-6 select-none animate-in">
        {error && (
          <div className="rounded-xl border border-[#7b1c1c] bg-red-50/50 p-4 text-xs font-semibold text-[#7b1c1c]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-[#d9d9d9] bg-white p-5 rounded-2xl shadow-xs">
          <div className="flex flex-wrap gap-4 items-center flex-1">
            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar por código o descripción..."
                className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 pl-9 pr-4 text-xs placeholder-neutral-400 focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
              />
            </div>

            <div className="relative">
              <select
                value={category}
                onChange={event => setCategory(event.target.value)}
                className="block rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-4 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
              >
                <option value="">Todas las categorías</option>
                {categories.map(item => (
                  <option key={item.id_categoria} value={item.id_categoria}>
                    {item.nombre_categoria}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#d9d9d9] bg-white shadow-xs">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#d9d9d9] bg-[#f8fafc]">
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[80px]">Imagen</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[160px]">Código</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Categoría</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9d9d9]/40">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-xs text-neutral-400">
                      Cargando productos del catálogo...
                    </td>
                  </tr>
                ) : products.length ? (
                  products.map(product => {
                    const isLowStock = Number(product.stock_total) <= Number(product.stock_minimo || 10);
                    return (
                      <tr key={product.id_producto} className="hover:bg-[#f8fafc]/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] flex items-center justify-center">
                            <ProductImage product={product} className="h-full w-full object-cover" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-xs text-[#414141] group-hover:text-black">
                            {product.codigo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-neutral-500">
                            {product.nombre_categoria || 'Sin categoría'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border
                            ${isLowStock 
                              ? 'bg-[#7b1c1c]/5 text-[#7b1c1c] border-[#7b1c1c]/10' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'}
                          `}>
                            {product.stock_total || 0} unidades
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-xs text-neutral-400">
                      No se encontraron productos registrados en el catálogo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#d9d9d9] px-6 py-4 bg-[#f8fafc]/50 flex items-center justify-between text-xs text-neutral-400">
            <span>{products.length} productos listados</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
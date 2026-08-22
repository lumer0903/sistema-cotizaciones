import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Edit3, Search, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiJson } from '../../infrastructure/http/apiClient';
import { authSession } from '../../application/auth/authSession';
import { can } from '../../application/auth/permissions';
import { AppLayout } from '../components/AppLayout';
import { Modal } from '../components/Modal';
import { ProductImage } from '../components/ProductImage';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const priceFields = [
  'precio_unidad_normal',
  'precio_unidad_dist',
  'precio_docena_normal',
  'precio_docena_dist',
  'precio_mayor_normal',
  'precio_mayor_dist'
];

const priceLabels = {
  precio_unidad_normal: 'Unidad normal',
  precio_unidad_dist: 'Unidad distribuidor',
  precio_docena_normal: 'Docena normal',
  precio_docena_dist: 'Docena distribuidor',
  precio_mayor_normal: 'Mayor normal',
  precio_mayor_dist: 'Mayor distribuidor'
};

export function ProductsAdminPage() {
  const editable = can(authSession.user(), 'productos', 'edicion');
  const importable = can(authSession.user(), 'importacion', 'edicion');
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
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

  const field = (key, value) => setEditing(current => ({ ...current, [key]: value }));

  async function save() {
    const payload = Object.fromEntries(
      ['descripcion', 'stock_total', 'stock_minimo', 'foto_url', 'id_categoria', ...priceFields]
        .map(key => [key, editing[key]])
    );
    await apiJson(`/api/productos/${editing.id_producto}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    setEditing(null);
    load();
  }

  async function remove() {
    await apiJson(`/api/productos/${deleting.id_producto}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  }

  return (
    <AppLayout title="Inventario de Productos">
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

          {importable && (
            <Link
              to="/importar-productos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-xs font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs hover:shadow-xs transition-all duration-150"
            >
              <Upload className="h-3.5 w-3.5 text-neutral-500" />
              <span>Importar CSV</span>
            </Link>
          )}
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
                  {editable && (
                    <th className="px-6 py-4 text-right text-[10px] font-bold tracking-wider text-neutral-400 uppercase w-[180px]">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9d9d9]/40">
                {loading ? (
                  <tr>
                    <td colSpan={editable ? 5 : 4} className="px-6 py-12 text-center text-xs text-neutral-400">
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
                        {editable && (
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => setEditing({ ...product })}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#414141] hover:bg-[#fdf2f2] hover:text-[#7b1c1c] shadow-2xs transition-all"
                              >
                                <Edit3 className="h-3 w-3 text-neutral-400" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => setDeleting(product)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#7b1c1c] hover:bg-[#fdf2f2] shadow-2xs transition-all"
                              >
                                <Trash2 className="h-3 w-3 text-[#7b1c1c]" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={editable ? 5 : 4} className="px-6 py-12 text-center text-xs text-neutral-400">
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

      <Modal 
        open={Boolean(editing)} 
        title="Editar producto" 
        onClose={() => setEditing(null)} 
        className="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <button 
              className="rounded-xl border border-[#d9d9d9] bg-white px-4 py-2 text-xs font-semibold text-[#414141] hover:bg-neutral-50 transition-all shadow-2xs" 
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
            <button 
              className="rounded-xl bg-[#7b1c1c] px-4 py-2 text-xs font-semibold text-white hover:bg-[#601414] transition-all shadow-xs" 
              onClick={() => save().catch(requestError => setError(requestError.message))}
            >
              Guardar cambios
            </button>
          </div>
        )}
      >
        {editing && (
          <div className="space-y-6">
            <div className="flex gap-4 items-start border-b border-[#d9d9d9] pb-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden border border-[#d9d9d9] bg-[#f8fafc] shrink-0">
                <ProductImage product={editing} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-sm font-semibold text-[#414141] block">{editing.codigo}</strong>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{editing.descripcion || 'Sin descripción agregada.'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Descripción
                </label>
                <textarea
                  value={editing.descripcion || ''}
                  onChange={event => field('descripcion', event.target.value)}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white p-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none min-h-[64px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Categoría
                </label>
                <div className="relative">
                  <select
                    value={editing.id_categoria || ''}
                    onChange={event => field('id_categoria', event.target.value || null)}
                    className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none appearance-none pr-10"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map(item => (
                      <option key={item.id_categoria} value={item.id_categoria}>
                        {item.nombre_categoria}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-400">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Foto URL
                </label>
                <input
                  value={editing.foto_url || ''}
                  onChange={event => field('foto_url', event.target.value)}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Stock disponible
                </label>
                <input
                  type="number"
                  min="0"
                  value={editing.stock_total || 0}
                  onChange={event => field('stock_total', Number(event.target.value))}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={editing.stock_minimo || 0}
                  onChange={event => field('stock_minimo', Number(event.target.value))}
                  className="block w-full rounded-xl border border-[#d9d9d9] bg-white py-2.5 px-3 text-xs focus:border-[#7b1c1c] focus:ring-1 focus:ring-[#7b1c1c]/5 transition-all outline-none"
                />
              </div>
            </div>

            <div className="border-t border-[#d9d9d9] pt-4 space-y-3">
              <h4 className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Precios y Tarifas</h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {priceFields.map(key => (
                  <div className="space-y-1" key={key}>
                    <span className="text-[10px] font-semibold text-neutral-500 block truncate">{priceLabels[key]}</span>
                    <div className="relative rounded-xl border border-[#d9d9d9] px-3 py-2 flex items-center bg-white focus-within:border-[#7b1c1c] transition-all">
                      <span className="text-xs text-neutral-400 mr-1.5">S/</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editing[key] || 0}
                        onChange={event => field(key, Number(event.target.value))}
                        className="w-full border-0 bg-transparent p-0 text-xs focus:ring-0 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        open={Boolean(deleting)} 
        title="Eliminar producto" 
        onClose={() => setDeleting(null)} 
        className="max-w-md"
        footer={(
          <div className="flex justify-end gap-3 w-full">
            <button 
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-all shadow-2xs" 
              onClick={() => setDeleting(null)}
            >
              Cancelar
            </button>
            <button 
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-all shadow-xs" 
              onClick={() => remove().catch(requestError => setError(requestError.message))}
            >
              Eliminar
            </button>
          </div>
        )}
      >
        <p className="text-xs text-neutral-500 leading-relaxed">
          ¿Estás seguro de que deseas eliminar permanentemente el producto <strong className="text-neutral-900 font-semibold">{deleting?.codigo}</strong>? Esta acción no se puede deshacer y el producto será retirado del catálogo.
        </p>
      </Modal>
    </AppLayout>
  );
}
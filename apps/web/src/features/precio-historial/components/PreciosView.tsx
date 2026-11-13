'use client';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, Select, FilterCard, FilterGrid, Pagination, Button } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { apiClient, apiErrorMessage } from '@/lib/apiClient';
import { PriceCard } from './PriceCard';
import { HistorialPrecioModal } from './HistorialPrecioModal';
import { getProductosConsulta } from '../api/precioApi';

export function PreciosView() {
  const { isAdmin, isGerente } = usePermissions();

  const categoriesQuery = useQuery({
    queryKey: ['precios', 'categorias'],
    queryFn: async ({ signal }) => {
      type Category = { id_categoria: number; nombre_categoria: string };
      const data: Category[] = [];
      let page = 1, total = 0;
      do {
        const result = await apiClient<{ data: Category[]; total: number }>(`/precios/categorias?limit=100&page=${page}`, { signal });
        data.push(...result.data); total = result.total; page++;
        if (!result.data.length) break;
      } while (data.length < total);
      return { data };
    },
  });

  const [filters, setFilters] = useState({ search: '', stock_status: '', id_categoria: '' });
  const [tipoCliente, setTipoCliente] = useState<'distribuidor' | 'tienda'>('distribuidor');
  const [page, setPage] = useState(1), [limit, setLimit] = useState(8);
  const [selected, setSelected] = useState<{ id: string; codigo: string } | null>(null);
  const search = useDebounce(filters.search, 300);

  const tieneFiltrosActivos = Boolean(filters.search || filters.stock_status || filters.id_categoria || tipoCliente !== 'distribuidor');

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries({ ...filters, search }).forEach(([k, v]) => { if (v !== '') params.set(k, v); });
  const query = params.toString();

  const { data, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['precios', { page, limit, ...filters, search }],
    queryFn: ({ signal }) => getProductosConsulta(query, signal),
  });

  const update = (key: keyof typeof filters, value: string) => { setFilters(old => ({ ...old, [key]: value })); setPage(1); };

  return <div className="w-full space-y-6">
    <h1 className="sr-only">Consulta de precios</h1>
    <FilterCard className="w-full"><FilterGrid>
      <div className="flex-[2] min-w-[240px] lg:min-w-[300px]">
        <Input variant="filter" icon={<Search className="h-4 w-4 text-[#F8B602]" strokeWidth={2} />} label="Buscar código/descripción" placeholder="Buscar por código o descripción…" value={filters.search} onChange={e => update('search', e.target.value)} />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[195px]">
        <Select variant="filter" label="Tipo de cliente" value={tipoCliente} onChange={e => setTipoCliente(e.target.value === 'tienda' ? 'tienda' : 'distribuidor')} options={[
          { label: 'Distribuidor', value: 'distribuidor' }, { label: 'Tienda', value: 'tienda' }]} />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[195px]">
        <Select variant="filter" label="Stock" value={filters.stock_status} onChange={e => update('stock_status', String(e.target.value))} options={[{ label: 'Bajo', value: 'bajo' }, { label: 'Todos', value: '' }, { label: 'Disponible', value: 'disponible' }]} />
      </div>
      <div className="flex-1 min-w-[140px] max-w-[195px]">
        <Select variant="filter" label="Categoría" disabled={categoriesQuery.isLoading || !!categoriesQuery.error} value={filters.id_categoria} onChange={e => update('id_categoria', String(e.target.value))} options={[{ label: 'Todas las categorías', value: '' }, ...(categoriesQuery.data?.data ?? []).map(c => ({ label: c.nombre_categoria, value: String(c.id_categoria) }))]} />
        {categoriesQuery.isLoading && <p role="status">Buscando categorías…</p>}{categoriesQuery.error && <p role="alert">{apiErrorMessage(categoriesQuery.error)}</p>}
      </div>
    </FilterGrid></FilterCard>

    {/* FILTROS ACTIVOS */}
    {tieneFiltrosActivos && (
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-default mt-3">
        {filters.search && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
            <span className="font-bold">Buscar:</span>
            {filters.search.substring(0, 15)}{filters.search.length > 15 ? '...' : ''}
            <button
              onClick={() => setFilters(old => ({ ...old, search: '' }))}
              className="hover:bg-slate-200/75 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.stock_status && filters.stock_status !== '' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
            <span className="font-bold">Stock:</span>
            {filters.stock_status === 'bajo' ? 'Bajo' : filters.stock_status === 'disponible' ? 'Suficiente' : 'Agotado'}
            <button
              onClick={() => setFilters(old => ({ ...old, stock_status: '' }))}
              className="hover:bg-slate-200/75 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar estado de stock"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.id_categoria && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
            <span className="font-bold">Categoría:</span>
            {filters.id_categoria}
            <button
              onClick={() => setFilters(old => ({ ...old, id_categoria: '' }))}
              className="hover:bg-slate-200/75 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar categoría"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {tipoCliente !== 'distribuidor' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-selection text-brand-subtitle text-xs font-medium rounded-full border border-accent-primary/40 shadow-sm">
            <span className="font-bold">Tipo cliente:</span>
            {tipoCliente === 'tienda' ? 'Tienda' : 'Distribuidor'}
            <button
              onClick={() => setTipoCliente('distribuidor')}
              className="hover:bg-slate-200/75 rounded-full p-0.5 transition-colors"
              aria-label="Limpiar tipo de cliente"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>
    )}

    {loading ? <div role="status" className="animate-pulse p-8 bg-surface-muted rounded-xl">Cargando precios…</div> :
      error ? <div role="alert"><p>{apiErrorMessage(error)}</p><Button onClick={() => refetch()}>Reintentar</Button></div> :
        !data?.data?.length ? <p className="p-8 text-center">No se encontraron productos con estos filtros.</p> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {data.data.map((producto) => (
              <PriceCard
                key={producto.id}
                producto={producto}
                tipoPrecio={tipoCliente}
                onVerHistorial={
                  isAdmin || isGerente
                    ? () => setSelected({ id: producto.id, codigo: producto.codigo })
                    : undefined
                }
              />
            ))}
          </div>}
    <Pagination loading={loading} currentPage={page} totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / limit))} totalItems={data?.total ?? 0} limit={limit} onPageChange={setPage}
      onLimitChange={v => { setLimit(v); setPage(1); }} itemLabel="productos" />
    {selected && <HistorialPrecioModal key={selected.id} open onClose={() => setSelected(null)} productoId={selected.id} codigoProducto={selected.codigo} />}
  </div>;
}

'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import { Search, Filter, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InventarioFilters as InventarioFiltersType, Categoria, Almacen } from '@goldcontinent/shared/types/inventario';

interface InventarioFiltersProps {
  categorias: Categoria[];
  almacenes: Almacen[];
  filters: InventarioFiltersType;
  onFiltersChange: (filters: Partial<InventarioFiltersType>) => void;
  loading?: boolean;
  canEdit?: boolean;
  onCrear?: () => void;
}

export function InventarioFilters({
  categorias,
  almacenes,
  filters,
  onFiltersChange,
  loading = false,
  canEdit = false,
  onCrear,
}: InventarioFiltersProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchValue, setSearchValue] = useState(filters.search);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      onFiltersChange({ search: value, page: 1 });
    }, 300);
  }, [onFiltersChange]);

  const handleClearFilters = useCallback(() => {
    onFiltersChange({
      search: '',
      id_categoria: null,
      id_almacen: null,
      soloStockBajo: false,
      page: 1,
    });
    setSearchValue('');
    searchInputRef.current?.focus();
  }, [onFiltersChange]);

  const hasActiveFilters = filters.search || filters.id_categoria || filters.id_almacen || filters.soloStockBajo;

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-amber-500/20 shadow-xl shadow-amber-500/5 mb-6 transition-all">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-800">Filtros</h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* BUSCAR */}
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-black text-amber-600/90 uppercase tracking-wider mb-1.5">
            Buscar Producto
          </label>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/70 group-focus-within:text-amber-600 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Código, descripción, tipo flor, material..."
              disabled={loading}
              className="w-full h-10 pl-10 pr-10 text-sm bg-gray-50/50 focus:bg-white border border-gray-200/80 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {searchValue && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* CATEGORÍA */}
        <div>
          <label className="block text-[11px] font-black text-amber-600/90 uppercase tracking-wider mb-1.5">
            CATEGORÍA
          </label>
          <select
            value={filters.id_categoria?.toString() ?? ''}
            onChange={(e) => onFiltersChange({ id_categoria: e.target.value ? Number(e.target.value) : null, page: 1 })}
            disabled={loading}
            className="w-full h-10 px-3 text-sm bg-gray-50/50 focus:bg-white border border-gray-200/80 focus:border-amber-500 rounded-xl outline-none appearance-none pr-8 text-gray-600 cursor-pointer disabled:opacity-50 focus:ring-4 focus:ring-amber-500/10 transition-all"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria.toString()}>
                {cat.nombre_categoria}
              </option>
            ))}
          </select>
        </div>

        {/* ALMACÉN */}
        <div>
          <label className="block text-[11px] font-black text-amber-600/90 uppercase tracking-wider mb-1.5">
            ALMACÉN
          </label>
          <select
            value={filters.id_almacen?.toString() ?? ''}
            onChange={(e) => onFiltersChange({ id_almacen: e.target.value ? Number(e.target.value) : null, page: 1 })}
            disabled={loading}
            className="w-full h-10 px-3 text-sm bg-gray-50/50 focus:bg-white border border-gray-200/80 focus:border-amber-500 rounded-xl outline-none appearance-none pr-8 text-gray-600 cursor-pointer disabled:opacity-50 focus:ring-4 focus:ring-amber-500/10 transition-all"
          >
            <option value="">Todos</option>
            {almacenes.map((alm) => (
              <option key={alm.id_almacen} value={alm.id_almacen.toString()}>
                {alm.nombre} {alm.ubicacion ? `(${alm.ubicacion})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* STOCK BAJO */}
        <div className="flex items-end h-full pb-2">
          <label className="flex items-center gap-2 cursor-pointer w-full group">
            <input
              type="checkbox"
              checked={filters.soloStockBajo}
              onChange={(e) => onFiltersChange({ soloStockBajo: e.target.checked, page: 1 })}
              disabled={loading}
              className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all"
            />
            <span className="text-[12px] font-bold text-gray-700 uppercase group-hover:text-amber-600 transition-colors tracking-wider">Solo stock bajo</span>
          </label>
        </div>
      </div>

      {/* BOTÓN CREAR - Solo si tiene permisos */}
      {canEdit && onCrear && (
        <div className="mt-4 pt-4 border-t border-amber-500/10 flex justify-end">
          <button
            onClick={onCrear}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <span>Agregar Producto</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
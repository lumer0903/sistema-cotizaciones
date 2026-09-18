'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, LayoutList, LayoutGrid, Plus, RotateCw, SlidersHorizontal } from 'lucide-react';
import { Categoria, Almacen } from '@goldcontinent/shared/types/inventario';

interface InventarioFiltersProps {
  categorias?: Categoria[];
  almacenes?: Almacen[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedCategoria: string;
  onCategoriaChange: (value: string) => void;
  selectedUbicacion: string;
  onUbicacionChange: (value: string) => void;
  onAgregarProducto: () => void;
  onRefresh?: () => void;
  onAjustarStock?: () => void;
  loading?: boolean;
}

export function InventarioFilters({
  categorias = [],
  almacenes = [],
  searchValue,
  onSearchChange,
  selectedCategoria,
  onCategoriaChange,
  selectedUbicacion,
  onUbicacionChange,
  onAgregarProducto,
  onAjustarStock,
  onRefresh,
  loading = false,
}: InventarioFiltersProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border-l-4 border-yellow-500 p-4 flex flex-wrap lg:flex-nowrap justify-between items-end gap-4 text-xs font-['DM_Sans']">
      {/* BUSCADOR */}
      <div className="flex-1 min-w-[200px] flex flex-col gap-1">
        <span className="text-xs font-black tracking-wide uppercase text-zinc-500">
          BUSCAR
        </span>
        <div className="relative w-full h-10 px-3 bg-white rounded-lg border border-yellow-500 flex items-center gap-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500 shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por código o flor..."
            className="w-full bg-transparent text-neutral-700 text-xs focus:outline-none pl-3"
          />
        </div>
      </div>

      {/* CATEGORIA */}
      <div className="w-36 flex flex-col gap-1">
        <span className="text-xs font-black tracking-wide uppercase text-zinc-500">
          CATEGORIA
        </span>
        <div className="relative w-full h-10 bg-white rounded-lg border border-yellow-500 flex items-center">
          <select
            value={selectedCategoria}
            onChange={(e) => onCategoriaChange(e.target.value)}
            className="w-full h-full bg-transparent text-neutral-700 text-xs appearance-none pl-3 pr-7 focus:outline-none cursor-pointer z-10"
          >
            <option value="" className="bg-white">Seleccionar</option>
            {categorias.map((cat) => (
              <option key={cat.id_categoria} value={cat.id_categoria.toString()} className="bg-white">
                {cat.nombre_categoria}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-yellow-500 absolute right-2 pointer-events-none z-0" />
        </div>
      </div>

      {/* UBICACIÓN */}
      <div className="w-36 flex flex-col gap-1">
        <span className="text-xs font-black tracking-wide uppercase text-zinc-500">
          UBICACIÓN
        </span>
        <div className="relative w-full h-10 bg-white rounded-lg border border-yellow-500 flex items-center">
          <select
            value={selectedUbicacion}
            onChange={(e) => onUbicacionChange(e.target.value)}
            className="w-full h-full bg-transparent text-neutral-700 text-xs appearance-none pl-3 pr-7 focus:outline-none cursor-pointer z-10"
          >
            <option value="" className="bg-white">Seleccionar</option>
            {almacenes.map((alm) => (
              <option key={alm.id_almacen} value={alm.id_almacen.toString()} className="bg-white">
                {alm.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-yellow-500 absolute right-2 pointer-events-none z-0" />
        </div>
      </div>

      {/* ICONOS EN FILTRO: ACTUALIZAR, AJUSTAR STOCK, VISTAS */}
      <div className="flex items-center gap-1 h-10">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="h-10 w-10 rounded-lg border border-yellow-500 bg-white hover:bg-yellow-50 text-yellow-600 flex items-center justify-center transition-colors disabled:opacity-50"
          title="Actualizar lista"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`h-10 w-10 rounded-lg border border-yellow-500 flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-white text-yellow-500'
            }`}
          title="Vista Lista"
        >
          <LayoutList className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setViewMode('grid')}
          className={`h-10 w-10 rounded-lg border border-yellow-500 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-white text-yellow-500'
            }`}
          title="Vista Cuadrícula"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>

      {/* BOTÓN AGREGAR */}
      <button
        type="button"
        onClick={onAgregarProducto}
        className="h-10 px-4 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-colors shrink-0"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Agregar Producto</span>
      </button>
    </div>
  );
}
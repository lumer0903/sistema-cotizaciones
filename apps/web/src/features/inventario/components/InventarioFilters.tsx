'use client';

import React from 'react';
import { Search, ChevronDown, Plus, RotateCw, PackagePlus, ArrowLeftRight, ClipboardList, Bell } from 'lucide-react';
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
  onMovimiento?: () => void;
  onTransferencia?: () => void;
  onKardex?: () => void;
  onAlertas?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  alertasCount?: number;
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
  onMovimiento,
  onTransferencia,
  onKardex,
  onAlertas,
  onRefresh,
  loading = false,
  alertasCount = 0,
}: InventarioFiltersProps) {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border-l-4 border-yellow-500 p-4 flex flex-wrap lg:flex-nowrap justify-between items-end gap-3 text-xs font-['DM_Sans']">

      {/* BUSCADOR */}
      <div className="flex-1 min-w-[200px] flex flex-col gap-1">
        <span className="text-[11px] font-black tracking-wide uppercase text-zinc-500">
          BUSCAR
        </span>
        <div className="relative w-full h-10 bg-white rounded-lg border border-yellow-500 flex items-center">
          <Search className="w-4 h-4 text-yellow-500 shrink-0 ml-3" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por código o flor..."
            className="w-full h-full bg-transparent text-neutral-700 text-xs focus:outline-none px-2"
          />
        </div>
      </div>

      {/* CATEGORIA */}
      <div className="w-36 flex flex-col gap-1">
        <span className="text-[11px] font-black tracking-wide uppercase text-zinc-500">
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
        <span className="text-[11px] font-black tracking-wide uppercase text-zinc-500">
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

      {/* BLOQUE DE ACCIONES (Refrescar + Iconos + Agregar) */}
      <div className="flex items-center gap-2 h-10">

        {/* Refrescar */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="h-10 w-10 rounded-lg border border-yellow-500 bg-white hover:bg-yellow-50 text-yellow-600 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          title="Actualizar lista"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Movimiento */}
        {onMovimiento && (
          <button
            type="button"
            onClick={onMovimiento}
            className="h-10 w-10 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center transition-colors shrink-0"
            title="Nuevo Movimiento Global"
          >
            <PackagePlus className="w-4 h-4" />
          </button>
        )}

        {/* Transferencia */}
        {onTransferencia && (
          <button
            type="button"
            onClick={onTransferencia}
            className="h-10 w-10 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center transition-colors shrink-0"
            title="Transferencia Global"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        )}

        {/* Kardex */}
        {onKardex && (
          <button
            type="button"
            onClick={onKardex}
            className="h-10 w-10 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center transition-colors shrink-0"
            title="Kárdex Global"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
        )}

        {/* Alertas */}
        {onAlertas && (
          <button
            type="button"
            onClick={onAlertas}
            className="relative h-10 px-3 bg-rose-500 hover:bg-rose-600 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
            title="Ver Alertas de Stock"
          >
            <Bell className="w-4 h-4" />
            <span>Alertas</span>
            {alertasCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {alertasCount > 9 ? '9+' : alertasCount}
              </span>
            )}
          </button>
        )}

        {/* BOTÓN AGREGAR */}
        <button
          type="button"
          onClick={onAgregarProducto}
          className="h-10 px-4 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0 ml-1 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Agregar Producto</span>
        </button>
      </div>

    </div>
  );
}

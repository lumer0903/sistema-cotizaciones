'use client';

import React, { useState } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';

interface InventarioRowProps {
  producto: ProductoInventario;
  onEditar: (p: ProductoInventario) => void;
  onEliminar: (id: number) => void;
  isFirst?: boolean;
}

export function InventarioRow({ producto, onEditar, onEliminar, isFirst = false }: InventarioRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const ubicacionNombre = producto.stock_actual?.[0]?.almacen?.nombre || 'ESTANTE B';

  return (
    <div className="w-full flex flex-col font-['DM_Sans']">
      {/* 1. FILA DE TABLA VISTA PRINCIPAL */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-white border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors ${isFirst ? 'rounded-t-2xl' : ''
          } ${!isExpanded ? 'rounded-b-none' : ''}`}
      >
        {/* CÓDIGO */}
        <div className="w-1/6 h-14 px-5 flex items-center justify-center text-neutral-700 text-base font-light">
          {producto.codigo || 'RUF-FL'}
        </div>

        {/* CATEGORÍA */}
        <div className="w-1/4 h-14 px-5 flex items-center justify-center text-neutral-700 text-base font-light uppercase">
          {producto.categoria?.nombre_categoria || 'ADORNO'}
        </div>

        {/* UBICACIÓN */}
        <div className="w-1/4 h-14 px-5 flex items-center justify-center text-neutral-700 text-base font-light uppercase">
          {ubicacionNombre}
        </div>

        {/* STOCK */}
        <div className="w-1/6 h-14 px-5 flex items-center justify-center text-emerald-600 text-base font-light">
          {producto.stock_total ?? 100}
        </div>

        {/* ACCIONES */}
        <div className="w-1/6 h-14 px-5 flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEditar(producto)}
            className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEliminar(producto.id_producto)}
            className="p-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* CHEVRON ACORDEÓN */}
        <div className="w-12 h-14 px-3 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-neutral-700 hover:text-black transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. PANEL DESPLEGABLE CON DETALLES Y FOTO (FIGMA MATCH) */}
      {isExpanded && (
        <div className="w-full px-6 sm:px-10 py-4 bg-neutral-50 border-l-2 border-r-2 border-b-2 border-gray-100 flex flex-wrap lg:flex-nowrap justify-between items-start gap-6 overflow-hidden transition-all">

          {/* FOTO DEL PRODUCTO */}
          <div className="w-32 h-36 flex shrink-0 justify-center items-center">
            <img
              src={producto.foto_url || 'https://placehold.co/115x128'}
              alt={producto.descripcion || 'Producto'}
              className="w-28 h-32 rounded-[5px] object-cover border border-gray-200 bg-white"
            />
          </div>

          {/* COLUMNA DETALLES 1 */}
          <div className="flex-1 min-w-[200px] flex flex-col justify-start items-start gap-3">
            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">CÓDIGO / TIPO</span>
              <span className="text-neutral-700 text-sm font-light">{producto.codigo || 'RUF-FL'} - {producto.tipo_flor || 'Follaje'}</span>
            </div>

            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">DESCRIPCIÓN</span>
              <span className="text-neutral-700 text-sm font-light">{producto.descripcion || 'Clavos con cabeza 3"x14'}</span>
            </div>

            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">CATEGORÍA</span>
              <span className="text-neutral-700 text-sm font-light">{producto.categoria?.nombre_categoria || 'Adorno'}</span>
            </div>
          </div>

          {/* COLUMNA DETALLES 2 */}
          <div className="flex-1 min-w-[200px] flex flex-col justify-start items-start gap-3">
            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">UBICACIÓN</span>
              <span className="text-neutral-700 text-sm font-light">{ubicacionNombre}</span>
            </div>

            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">STOCK</span>
              <span className="text-neutral-700 text-sm font-light">{producto.stock_total ?? 100}</span>
            </div>

            <div className="border-b border-gray-200 pb-1 w-full">
              <span className="block text-gray-400 text-xs font-semibold tracking-wide uppercase">FECHA DE INGRESO</span>
              <span className="text-neutral-700 text-sm font-light">13-08-2026</span>
            </div>
          </div>

          {/* ACCIONES DEL PANAL EXPANDIDO */}
          <div className="w-28 flex flex-col justify-start items-start gap-2">
            <span className="text-gray-400 text-xs font-semibold tracking-wide uppercase border-b border-gray-200 pb-1 w-full">
              ACCIONES
            </span>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onEditar(producto)}
                className="p-1.5 text-amber-500 hover:bg-amber-100/60 rounded-md transition-colors"
                title="Editar producto"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onEliminar(producto.id_producto)}
                className="p-1.5 text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors"
                title="Eliminar producto"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Pencil, ClipboardList, MoreHorizontal, AlertCircle, CheckCircle, ChevronDown, Package } from 'lucide-react';
import { ProductoInventario, StockActualConAlmacen } from '@goldcontinent/shared/types/inventario';
import { ColorTags } from './ColorTags';
import { Tooltip } from '@/components/ui/Tooltip';

interface InventarioRowProps {
  producto: ProductoInventario;
  onClick: (producto: ProductoInventario) => void;
  onEditarClick: (e: React.MouseEvent, p: ProductoInventario) => void;
  onKardexClick: (e: React.MouseEvent, p: ProductoInventario) => void;
  canEdit: boolean;
}

function getStockBadge(stock: number, minimo: number) {
  const isLow = stock > 0 && stock <= minimo;
  const isEmpty = stock === 0;
  return {
    isLow,
    isEmpty,
    label: isEmpty ? 'Sin stock' : isLow ? 'Stock bajo' : 'Normal',
    className: isEmpty ? 'bg-red-50 text-red-700 border-red-200/50' : isLow ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
    icon: isEmpty ? AlertCircle : isLow ? AlertCircle : CheckCircle,
  };
}

export function InventarioRow({
  producto,
  onClick,
  onEditarClick,
  onKardexClick,
  canEdit,
}: InventarioRowProps) {
  const [expanded, setExpanded] = useState(false);
  const stockInfo = getStockBadge(producto.stock_total, producto.stock_minimo);
  const StockIcon = stockInfo.icon;
  const multiAlmacen = producto.stock_actual && producto.stock_actual.length > 1;

  return (
    <div className="group border-b border-gray-100/80 last:border-none transition-colors">
      {/* FILA PRINCIPAL */}
      <div
        onClick={() => {
          setExpanded(!expanded);
          onClick(producto);
        }}
        className="grid grid-cols-12 items-center py-4 px-6 hover:bg-amber-50/40 cursor-pointer transition-all text-sm group-hover:translate-x-0.5 bg-white"
        role="row"
      >
        {/* CÓDIGO */}
        <div className="col-span-12 md:col-span-2 font-mono font-bold text-gray-900 tracking-tight truncate max-w-full">
          {producto.codigo}
        </div>

        {/* PRODUCTO (Antes era descripción + chips, ahora según diseño: nombre o categoría) */}
        <div className="col-span-12 md:col-span-4 min-w-0 flex flex-col gap-1.5">
          <div className="truncate font-medium text-gray-800" title={producto.descripcion}>
            {producto.descripcion}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {producto.tipo_flor && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200/60 uppercase">
                {producto.tipo_flor}
              </span>
            )}
            {producto.material && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200/60 uppercase">
                {producto.material}
              </span>
            )}
          </div>
        </div>

        {/* ALMACÉN */}
        <div className="col-span-12 md:col-span-2 flex flex-col items-center gap-1 text-gray-500 text-xs font-medium uppercase">
          <span className="truncate max-w-[150px]">
            {producto.stock_actual?.[0]?.almacen?.nombre ?? 'Sin almacén'}
          </span>
          {multiAlmacen && (
            <Tooltip content={producto.stock_actual!.map(s => `${s.almacen.nombre}: ${s.cantidad}`).join(', ')} position="top">
              <span className="text-[10px] text-amber-600 hover:text-amber-700 cursor-help normal-case">
                + {producto.stock_actual!.length - 1} sedes
              </span>
            </Tooltip>
          )}
        </div>

        {/* STOCK */}
        <div className="col-span-12 md:col-span-2 flex items-center justify-center">
          <span className={`font-bold px-2.5 py-1 rounded-md text-xs border flex items-center gap-1.5 ${stockInfo.className}`}>
            <StockIcon className="w-3.5 h-3.5" />
            {producto.stock_total}
          </span>
        </div>

        {/* ACCIONES */}
        <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 text-gray-400">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditarClick(e, producto); }}
              className="p-1.5 hover:text-amber-600 hover:bg-amber-100/50 rounded-lg transition-all"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onKardexClick(e, producto); }}
            className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Kárdex"
          >
            <ClipboardList className="w-4 h-4" />
          </button>
          <div className={`p-1.5 rounded-lg transition-transform duration-200 ${expanded ? 'rotate-180 text-amber-600' : ''}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* DETALLE EXPANDIDO CON ANIMACIÓN */}
      <div className={`grid transition-all duration-300 ease-in-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50/30 via-white to-gray-50/50 p-6 border-y border-amber-100/60 my-1">
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Imagen (Placeholder ya que la API puede no devolverla aún) */}
              <div className="w-28 h-28 rounded-xl overflow-hidden border border-amber-200/50 shadow-md flex-shrink-0 bg-white">
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">
                  <Package className="w-10 h-10" />
                </div>
              </div>
              
              {/* Grid de Atributos */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white/80 p-3 rounded-xl border border-gray-100 shadow-sm col-span-2">
                  <span className="block font-bold text-gray-400 uppercase text-[10px] mb-1">Descripción Completa</span>
                  <span className="font-semibold text-gray-800 text-sm">{producto.descripcion || 'Sin descripción'}</span>
                </div>
                
                <div className="bg-white/80 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="block font-bold text-gray-400 uppercase text-[10px] mb-1">Colores</span>
                  <div className="mt-1">
                    <ColorTags colors={producto.colores_surtido} maxVisible={3} size="sm" interactive={false} />
                  </div>
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="block font-bold text-gray-400 uppercase text-[10px] mb-1">Presentación</span>
                  <span className="font-semibold text-gray-800 text-sm">{producto.presentacion || 'N/A'}</span>
                </div>
                
                <div className="bg-white/80 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <span className="block font-bold text-gray-400 uppercase text-[10px] mb-1">Stock Mínimo</span>
                  <span className="font-semibold text-amber-600 text-sm">{producto.stock_minimo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import { Package, Search, Loader2 } from 'lucide-react';
import { ClipboardList } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { InventarioRow } from './InventarioRow';
import { ColorTags } from './ColorTags';

interface InventarioTableProps {
  productos: ProductoInventario[];
  loading: boolean;
  onRowClick: (p: ProductoInventario) => void;
  onEditarClick: (e: React.MouseEvent, p: ProductoInventario) => void;
  onKardexClick: (e: React.MouseEvent, p: ProductoInventario) => void;
  canEdit: boolean;
  emptyMessage?: string;
}

export function InventarioTable({
  productos,
  loading,
  onRowClick,
  onEditarClick,
  onKardexClick,
  canEdit,
  emptyMessage = 'No hay productos registrados o no coinciden con la búsqueda.',
}: InventarioTableProps) {
  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando productos">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 bg-white rounded-lg border border-gray-100 animate-pulse">
            <div className="col-span-12 md:col-span-2 h-6 bg-gray-200 rounded w-3/4" />
            <div className="col-span-12 md:col-span-4 h-4 bg-gray-200 rounded w-4/5" />
            <div className="col-span-12 md:col-span-2 h-6 bg-gray-200 rounded w-3/4" />
            <div className="col-span-12 md:col-span-2 h-6 bg-gray-200 rounded w-2/3" />
            <div className="col-span-12 md:col-span-2 h-6 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-dashed border-gray-300">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-amber-500/5 border border-amber-500/10 overflow-hidden mb-6">
      {/* HEADER DESKTOP */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-amber-50/50 text-xs font-black text-amber-700/80 uppercase tracking-wider border-b border-amber-100">
        <div className="col-span-2">CÓDIGO</div>
        <div className="col-span-4">PRODUCTO</div>
        <div className="col-span-2 text-center">ALMACÉN</div>
        <div className="col-span-2 text-center">STOCK</div>
        <div className="col-span-2 text-right">ACCIONES</div>
      </div>

      {/* LISTA */}
      <div className="flex flex-col" role="list" aria-label="Lista de productos">
        {productos.map((producto) => (
          <InventarioRow
            key={producto.id_producto}
            producto={producto}
            onClick={onRowClick}
            onEditarClick={onEditarClick}
            onKardexClick={onKardexClick}
            canEdit={canEdit}
          />
        ))}
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {productos.map((producto) => (
          <div
            key={producto.id_producto}
            onClick={() => onRowClick(producto)}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-amber-200 transition-colors cursor-pointer"
            role="listitem"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <code className="font-mono text-sm font-medium text-gray-800">{producto.codigo}</code>
                <p className="text-sm text-gray-600 truncate mt-0.5">{producto.descripcion}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                producto.stock_total <= 0 ? 'bg-red-100 text-red-700' :
                producto.stock_total <= producto.stock_minimo ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {producto.stock_total} {producto.stock_total <= 0 ? 'Agotado' : producto.stock_total <= producto.stock_minimo ? 'Bajo' : 'OK'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {producto.tipo_flor && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{producto.tipo_flor}</span>}
              {producto.material && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{producto.material}</span>}
              {producto.presentacion && <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{producto.presentacion}</span>}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500">{producto.stock_actual?.[0]?.almacen?.nombre ?? 'Sin almacén'}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <ColorTags colors={producto.colores_surtido} maxVisible={3} size="sm" />
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditarClick(e, producto); }}
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                  aria-label="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onKardexClick(e, producto); }}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                  aria-label="Kárdex"
                >
                  <ClipboardList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2, PackageSearch, Loader2 } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { DetalleProductoModal } from './DetalleProductoModal';
import { StockBadge } from './StockBadge';
import { formatCode, formatText } from '@/lib/formatters';
import { inventarioApi } from '@/features/inventario/api/inventario.api';

interface InventarioTableProps {
  productos: ProductoInventario[];
  loading?: boolean;
  onEditar: (producto: ProductoInventario) => void;
  onEliminar: (id: number) => void;
  onMovimiento?: (productoId: number) => void;
  onTransferencia?: (productoId: number) => void;
  onKardex?: (producto: ProductoInventario) => void;
}

const COLUMNS = ['CÓDIGO', 'CATEGORÍA', 'UBICACIÓN', 'STOCK', 'ACCIONES'];

/** Estado de carga coherente con la tabla (mismo esqueleto de filas). */
function TableSkeleton() {
  return (
    <div
      className="w-full"
      role="status"
      aria-live="polite"
      aria-label="Cargando inventario"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Cargando inventario...
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-6 w-12 bg-gray-200 rounded-full" />
            <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Estado vacío con icono y texto claro. */
function TableEmpty() {
  return (
    <div className="w-full p-8 sm:p-16 text-center text-brand-options">
      <PackageSearch className="w-10 h-10 mx-auto mb-3 text-brand-options/70" aria-hidden="true" />
      <p className="font-medium text-brand-subtitle">No se encontraron productos</p>
      <p className="text-sm mt-1">Ajuste los filtros o agregue un producto al inventario.</p>
    </div>
  );
}

export function InventarioTable({
  productos,
  loading = false,
  onEditar,
  onEliminar,
}: InventarioTableProps) {
  const [detalleProducto, setDetalleProducto] = useState<ProductoInventario | null>(null);

  const handleVerDetalle = async (prod: ProductoInventario) => {
    // Apertura optimista con lo que hay en la lista
    setDetalleProducto(prod);
    // Si la fila no trae precios (lista sin include), traer el detalle completo
    const p = prod as ProductoInventario & {
      precios_actuales?: unknown;
      precios?: unknown;
      precioTienda?: unknown;
      precioDistribuidor?: unknown;
    };
    const sinPrecios =
      !p.precios_actuales && !p.precios && !p.precioTienda && !p.precioDistribuidor;
    if (sinPrecios && prod.id_producto) {
      try {
        const full = await inventarioApi.obtenerPorId(prod.id_producto);
        const data =
          (full as { data?: ProductoInventario })?.data ??
          (full as unknown as ProductoInventario);
        if (data) setDetalleProducto(data);
      } catch (e) {
        console.warn('[InventarioTable] No se pudo cargar detalle con precios:', e);
      }
    }
  };

  if (loading) return <TableSkeleton />;
  if (productos.length === 0) return <TableEmpty />;

  return (
    <>
      <Table
        wrapperClassName="border-0 rounded-none shadow-none"
        className="min-w-[600px]"
        scrollLabel="Listado de productos del inventario"
      >
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col}
                className={
                  col === 'ACCIONES'
                    ? 'text-center sticky right-0 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]'
                    : col === 'STOCK'
                      ? 'text-center'
                      : undefined
                }
              >
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((prod) => {
            const id = prod.id_producto;
            const stockVal = prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? 0;
            const stockMinimo = prod.stock_minimo ?? 0;
            const ubicacion = prod.stock_actual?.[0]?.almacen?.nombre || '—';
            const categoria = prod.categoria?.nombre_categoria || '—';

            return (
              <TableRow key={id ?? prod.codigo}>
                <TableCell className="font-bold text-neutral-900 font-mono text-sm whitespace-nowrap">
                  {formatCode(prod.codigo)}
                </TableCell>
                <TableCell
                  className="text-sm truncate max-w-[180px]"
                  title={formatText(categoria)}
                >
                  {formatText(categoria)}
                </TableCell>
                <TableCell
                  className="text-sm truncate max-w-[180px]"
                  title={formatText(ubicacion)}
                >
                  {formatText(ubicacion)}
                </TableCell>
                <TableCell className="text-center">
                  <StockBadge stock={stockVal} minimo={stockMinimo} />
                </TableCell>
                <TableCell className="text-center sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleVerDetalle(prod)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-brand-primary transition-colors"
                      title="Ver detalle"
                      aria-label={`Ver detalle de ${formatCode(prod.codigo)}`}
                    >
                      <Eye className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditar(prod)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-brand-primary transition-colors"
                      title="Editar"
                      aria-label={`Editar ${formatCode(prod.codigo)}`}
                    >
                      <Pencil className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => id !== undefined && onEliminar(id)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-danger transition-colors"
                      title="Eliminar"
                      aria-label={`Eliminar ${formatCode(prod.codigo)}`}
                    >
                      <Trash2 className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DetalleProductoModal
        open={!!detalleProducto}
        onClose={() => setDetalleProducto(null)}
        producto={detalleProducto}
        onEditar={onEditar}
        canEdit
      />
    </>
  );
}

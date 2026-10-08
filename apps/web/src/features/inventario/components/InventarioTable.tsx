'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2, PackageSearch, Loader2 } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button } from '@/components/ui';
import { DetalleProductoModal } from './DetalleProductoModal';
import { StockBadge } from './StockBadge';
import { formatCode, formatText } from '@/lib/formatters';
import { inventarioApi } from '@/features/inventario/api/inventario.api';
import { Can } from '@/components/shared/Can';

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

function TableSkeleton() {
  return (
    <div
      className="w-full"
      role="status"
      aria-live="polite"
      aria-label="Cargando inventario"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50/80 border-b border-zinc-200 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Cargando inventario...
      </div>
      <div className="divide-y divide-zinc-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
            <div className="h-4 w-24 bg-zinc-200 rounded" />
            <div className="h-4 w-32 bg-zinc-200 rounded" />
            <div className="h-4 w-28 bg-zinc-200 rounded" />
            <div className="h-6 w-12 bg-zinc-200 rounded-full" />
            <div className="h-4 w-20 bg-zinc-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
    setDetalleProducto(prod);
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
                    ? 'text-center sticky right-0 bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]'
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
                <TableCell className="font-bold text-zinc-900 font-mono text-sm whitespace-nowrap">
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
                <TableCell className="text-center sticky right-0 bg-white group-hover:bg-zinc-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Can modulo="productos" nivel="edicion">
                      <Button
                        variant="ghost"
                        onClick={() => onEditar(prod)}
                        className="min-h-11 min-w-11 p-0 text-brand-ink hover:text-brand-primary"
                        title="Editar"
                        aria-label={`Editar ${formatCode(prod.codigo)}`}
                      >
                        <Pencil className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </Can>
                    <Can modulo="productos" nivel="lectura">
                      <Button
                        variant="ghost"
                        onClick={() => handleVerDetalle(prod)}
                        className="min-h-11 min-w-11 p-0 text-brand-ink hover:text-brand-primary"
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${formatCode(prod.codigo)}`}
                      >
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </Can>
                    <Can modulo="productos" nivel="edicion">
                      <Button
                        variant="ghost"
                        onClick={() => id !== undefined && onEliminar(id)}
                        className="min-h-11 min-w-11 p-0 text-brand-ink hover:text-danger"
                        title="Eliminar"
                        aria-label={`Eliminar ${formatCode(prod.codigo)}`}
                      >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </Can>
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
      />
    </>
  );
}
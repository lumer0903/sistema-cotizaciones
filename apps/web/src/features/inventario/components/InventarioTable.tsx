'use client';
import { IconButton } from '@/components/ui/IconButton';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2, PackageSearch, Loader2 } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { DetalleProductoModal } from './DetalleProductoModal';
import { StockBadge } from './StockBadge';
import { formatCode, formatText } from '@/lib/formatters';
import { inventarioApi } from '@/features/inventario/api/inventario.api';
import { Can } from '@/components/shared/Can';
import { cn } from '@/lib/cn';

interface InventarioTableProps {
  productos: ProductoInventario[];
  loading?: boolean;
  almacenId?: number;
  onEditar: (producto: ProductoInventario) => void;
  onEliminar: (id: number) => void;
}

// Definición de columnas con anchos fluidos y comportamiento responsive
const COLUMNS = [
  { key: 'CÓDIGO', headerClassName: 'font-semibold px-4 py-3 text-left', cellClassName: 'px-4 py-3 text-left font-semibold whitespace-nowrap' },
  { key: 'CATEGORÍA', headerClassName: 'px-4 py-3 text-left', cellClassName: 'px-4 py-3 text-left truncate' },
  { key: 'UBICACIÓN', headerClassName: 'px-4 py-3 text-left', cellClassName: 'px-4 py-3 text-left truncate' },
  { key: 'STOCK', headerClassName: 'px-6 py-3 text-center', cellClassName: 'px-6 py-3 text-center' },
  { key: 'ACCIONES', headerClassName: 'px-4 py-3 text-right', cellClassName: 'px-4 py-3 text-right whitespace-nowrap' },
] as const;

function TableSkeleton() {
  return (
    <div
      className="w-full"
      role="status"
      aria-live="polite"
      aria-label="Cargando inventario"
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-muted/80 border-b border-border-default text-xs font-semibold text-brand-options uppercase tracking-wider">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        Cargando inventario...
      </div>
      <div className="divide-y divide-border-default">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 animate-pulse">
            <div className="h-4 w-[140px] bg-surface-muted rounded" />
            <div className="h-4 w-[180px] bg-surface-muted rounded" />
            <div className="h-4 w-[140px] bg-surface-muted rounded" />
            <div className="h-6 w-[100px] bg-surface-muted rounded-full" />
            <div className="h-4 w-28 bg-surface-muted rounded ml-auto" />
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
  almacenId,
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
        wrapperClassName="border-0 rounded-none shadow-none overflow-x-auto"
        className="w-full min-w-0 border-collapse"
        scrollLabel="Listado de productos del inventario"
      >
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.headerClassName,
                  col.cellClassName,
                  'bg-surface border-b border-border-default'
                )}
              >
                {col.key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((prod) => {
            const id = prod.id_producto;
            const stockVal = prod.stock_filtrado ?? prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? 0;
            const stockMinimo = prod.stock_minimo ?? 0;
            const ubicacion = (almacenId ? prod.stock_actual?.find(s=>s.id_almacen===almacenId)?.almacen.nombre : prod.stock_actual?.map(s=>s.almacen.nombre).join(', ')) || '—';
            const categoria = prod.categoria?.nombre_categoria || '—';

            return (
              <TableRow key={id ?? prod.codigo}>
                <TableCell className={cn('font-bold text-brand-subtitle font-mono text-sm', COLUMNS[0].cellClassName)}>
                  {formatCode(prod.codigo)}
                </TableCell>
                <TableCell
                  className={cn('text-sm truncate', COLUMNS[1].cellClassName)}
                  title={formatText(categoria)}
                >
                  {formatText(categoria)}
                </TableCell>
                <TableCell
                  className={cn('text-sm truncate', COLUMNS[2].cellClassName)}
                  title={formatText(ubicacion)}
                >
                  {formatText(ubicacion)}
                </TableCell>
                <TableCell className={cn('bg-surface', COLUMNS[3].cellClassName)}>
                  <StockBadge stock={stockVal} minimo={stockMinimo} />
                </TableCell>
                <TableCell className={cn('bg-surface', COLUMNS[4].cellClassName)}>
                  <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Can modulo="productos" nivel="edicion">
                      <IconButton icon={Pencil} label={`Editar ${formatCode(prod.codigo)}`} onClick={() => onEditar(prod)}   />
                    </Can>
                    <Can modulo="productos" nivel="lectura">
                      <IconButton icon={Eye} label={`Ver detalle de ${formatCode(prod.codigo)}`} onClick={() => handleVerDetalle(prod)}   />
                    </Can>
                    <Can modulo="productos" nivel="edicion">
                      <IconButton icon={Trash2} label={`Eliminar ${formatCode(prod.codigo)}`} onClick={() => id !== undefined && onEliminar(id)}  destructive />
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

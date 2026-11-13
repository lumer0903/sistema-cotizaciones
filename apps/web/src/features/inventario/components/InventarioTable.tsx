'use client';
import React, { useState } from 'react';
import { Eye, Pencil, Trash2, PackageSearch, Loader2, MapPin } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { DetalleProductoModal } from './DetalleProductoModal';
import { StockBadge } from './StockBadge';
import { formatCode, formatText } from '@/lib/formatters';
import { inventarioApi } from '@/features/inventario/api/inventario.api';
import { Can } from '@/components/shared/Can';
import { cn } from '@/lib/cn';
import Image from 'next/image';
import { handleImageError } from '@/lib/imageUtils';

interface InventarioTableProps {
  productos: ProductoInventario[];
  loading?: boolean;
  almacenId?: number;
  onEditar: (producto: ProductoInventario) => void;
  onEliminar: (id: number) => void;
  footer?: React.ReactNode;
}

// Definición de columnas con anchos fluidos y comportamiento responsive
const COLUMNS = [
  { key: 'Código', headerClassName: '', cellClassName: 'min-w-[140px] max-w-[180px] whitespace-nowrap' },
  { key: 'Categoría', headerClassName: 'text-center', cellClassName: 'text-center min-w-[120px] max-w-[160px] whitespace-nowrap' },
  { key: 'Ubicación', headerClassName: '', cellClassName: 'min-w-[150px] max-w-[220px] truncate' },
  { key: 'Stock', headerClassName: 'text-center', cellClassName: 'text-center min-w-[90px] max-w-[110px] whitespace-nowrap' },
  { key: 'Acciones', headerClassName: 'text-right', cellClassName: 'text-right whitespace-nowrap min-w-[120px]' },
] as const;

function TableSkeleton() {
  return (
    <div
      className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando inventario"
    >
      <div className="flex items-center gap-2 pb-4 border-b border-[#F3F4F6] text-xs font-semibold text-[#575757] tracking-wider">
        <Loader2 className="w-4 h-4 animate-spin text-[#414141]" aria-hidden="true" />
        Cargando tabla...
      </div>
      <div className="divide-y divide-[#F3F4F6]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3.5 animate-pulse">
            <div className="h-4 w-[140px] bg-zinc-200 rounded" />
            <div className="h-4 w-[180px] bg-zinc-200 rounded" />
            <div className="h-4 w-[140px] bg-zinc-200 rounded" />
            <div className="h-6 w-[100px] bg-zinc-200 rounded-full" />
            <div className="h-4 w-28 bg-zinc-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableEmpty() {
  return (
    <div className="w-full bg-white rounded-2xl border-2 border-[#E5E7EB] p-8 sm:p-16 text-center text-sm text-[#575757]">
      <PackageSearch className="w-10 h-10 mx-auto mb-3 text-zinc-300" aria-hidden="true" />
      <p className="font-medium text-[#414141]">No se encontraron productos</p>
      <p className="mt-1 text-xs">Ajuste los filtros o agregue un producto al inventario.</p>
    </div>
  );
}

export function InventarioTable({
  productos,
  loading = false,
  onEditar,
  onEliminar,
  almacenId,
  footer,
}: InventarioTableProps) {
  const [detalleProducto, setDetalleProducto] = useState<ProductoInventario | null>(null);

  const handleVerDetalle = async (prod: ProductoInventario) => {
    setDetalleProducto(prod);
    const p = prod as ProductoInventario & { id_producto?: number; id?: number };
    const id = p.id_producto ?? p.id;
    if (id) {
      try {
        const detalleCompleto = await inventarioApi.obtenerPorId(id);
        setDetalleProducto(detalleCompleto);
      } catch (err) {
        console.error('Error al cargar detalle extendido:', err);
      }
    }
  };

  if (loading) return <TableSkeleton />;
  if (productos.length === 0) return <TableEmpty />;

  return (
    <>
      <Table footer={footer} scrollLabel="Inventario">
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(col.headerClassName, col.cellClassName)}
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
            const ubicacion =
              (almacenId
                ? prod.stock_actual?.find((s) => s.id_almacen === almacenId)?.almacen.nombre
                : prod.stock_actual?.map((s) => s.almacen.nombre).join(', ')) || '—';
            const categoria = prod.categoria?.nombre_categoria || '—';
            const fotoUrl = (prod as any).foto_url;

            return (
              <TableRow key={id ?? prod.codigo}>
                {/* CÓDIGO — identificador principal con peso visual y miniatura opcional */}
                <TableCell className={cn('font-semibold text-slate-900 tracking-tight tabular-nums', COLUMNS[0].cellClassName)}>
                  {fotoUrl ? (
                    <div className="flex items-center gap-2">
                      <Image
                        src={fotoUrl}
                        alt={prod.codigo}
                        width={28}
                        height={28}
                        className="size-7 rounded-md object-contain bg-slate-50 border border-slate-200"
                        onError={(e) => handleImageError(e, '28')}
                      />
                      {formatCode(prod.codigo)}
                    </div>
                  ) : (
                    formatCode(prod.codigo)
                  )}
                </TableCell>

                {/* CATEGORÍA — texto limpio, sin badges */}
                <TableCell className={cn('text-[13px] font-normal text-slate-600', COLUMNS[1].cellClassName)} title={formatText(categoria)}>
                  {formatText(categoria)}
                </TableCell>

                {/* UBICACIÓN — con icono MapPin sutil */}
                <TableCell className={cn('text-slate-600 font-medium', COLUMNS[2].cellClassName)} title={formatText(ubicacion)}>
                  {ubicacion !== '—' && <MapPin className="size-3.5 text-slate-400 inline mr-1.5" aria-hidden="true" />}
                  {formatText(ubicacion)}
                </TableCell>

                {/* STOCK — pill semántica con borde y contraste */}
                <TableCell className={cn(COLUMNS[3].cellClassName)}>
                  <StockBadge stock={stockVal} minimo={stockMinimo} />
                </TableCell>

                {/* ACCIONES — botones táctiles compactos size-7 con hover específico */}
                <TableCell className={cn(COLUMNS[4].cellClassName)}>
                  <div className="flex items-center justify-end gap-1">
                    <Can modulo="productos" nivel="edicion">
                      <button
                        type="button"
                        onClick={() => onEditar(prod)}
                        title={`Editar ${formatCode(prod.codigo)}`}
                        aria-label={`Editar ${formatCode(prod.codigo)}`}
                        className="size-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-[#F8B602]/15 hover:text-[#F8B602] text-[#F8B600]"
                      >
                        <Pencil className="size-4 text-slate-500" strokeWidth={1.75} />
                      </button>
                    </Can>
                    <Can modulo="productos" nivel="lectura">
                      <button
                        type="button"
                        onClick={() => handleVerDetalle(prod)}
                        title={`Ver detalle de ${formatCode(prod.codigo)}`}
                        aria-label={`Ver detalle de ${formatCode(prod.codigo)}`}
                        className="size-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-[#F8B602]/15 hover:text-[#F8B602] text-[#F8B600]"
                      >
                        <Eye className="size-4 text-slate-500" strokeWidth={1.75} />
                      </button>
                    </Can>
                    <Can modulo="productos" nivel="edicion">
                      <button
                        type="button"
                        onClick={() => id !== undefined && onEliminar(id)}
                        title={`Eliminar ${formatCode(prod.codigo)}`}
                        aria-label={`Eliminar ${formatCode(prod.codigo)}`}
                        className="size-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4 text-slate-500" strokeWidth={1.75} />
                      </button>
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

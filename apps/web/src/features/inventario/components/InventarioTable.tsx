'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { DetalleProductoModal } from './DetalleProductoModal';
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

export function InventarioTable({
  productos,
  loading = false,
  onEditar,
  onEliminar,
  onMovimiento: _onMovimiento,
  onTransferencia: _onTransferencia,
  onKardex: _onKardex,
}: InventarioTableProps) {
  const [detalleProducto, setDetalleProducto] = useState<ProductoInventario | null>(null);

  const handleVerDetalle = async (prod: ProductoInventario) => {
    // Apertura optimista con lo que hay en la lista
    setDetalleProducto(prod);
    // Si la fila no trae precios (lista sin include), traer el detalle completo
    const p = prod as any;
    const sinPrecios =
      !p.precios_actuales && !p.precios && !p.precioTienda && !p.precioDistribuidor;
    if (sinPrecios && prod.id_producto) {
      try {
        const full = await inventarioApi.obtenerPorId(prod.id_producto);
        const data = (full as any)?.data ?? full;
        if (data) setDetalleProducto(data as ProductoInventario);
      } catch (e) {
        console.warn('[InventarioTable] No se pudo cargar detalle con precios:', e);
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl p-12 text-center text-neutral-500 font-medium shadow-sm border border-gray-100 font-['DM_Sans']">
        Cargando inventario...
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl p-8 sm:p-16 text-center text-neutral-500 font-medium shadow-sm border border-gray-100 font-['DM_Sans']">
        No se encontraron productos en el inventario.
      </div>
    );
  }

  return (
    <>
      <Table wrapperClassName="border-0 rounded-none shadow-none" className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>CÓDIGO</TableHead>
            <TableHead>CATEGORÍA</TableHead>
            <TableHead>UBICACIÓN</TableHead>
            <TableHead className="text-center">STOCK</TableHead>
            <TableHead className="text-center sticky right-0 bg-gray-50 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((prod) => {
            const id = prod.id_producto;

            const stockVal = prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? 0;
            const ubicacion = prod.stock_actual?.[0]?.almacen?.nombre || 'ESTANTE B';
            const categoria = prod.categoria?.nombre_categoria || 'ADORNO';

            return (
              <TableRow key={id}>
                <TableCell className="font-bold text-neutral-900 font-mono text-sm whitespace-nowrap">
                  {formatCode(prod.codigo)}
                </TableCell>
                <TableCell className="text-sm truncate max-w-[180px]" title={formatText(categoria)}>
                  {formatText(categoria)}
                </TableCell>
                <TableCell className="text-sm truncate max-w-[180px]" title={formatText(ubicacion)}>
                  {formatText(ubicacion)}
                </TableCell>
                <TableCell className="text-center font-bold text-estado-aprobado-text text-sm">
                  {stockVal}
                </TableCell>
                <TableCell className="text-center sticky right-0 bg-white group-hover:bg-amber-50/40 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleVerDetalle(prod)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-brand-ink hover:bg-brand-soft rounded-lg transition-colors"
                      title="Ver detalle"
                      aria-label={`Ver detalle de ${formatCode(prod.codigo)}`}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditar(prod)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-brand-ink hover:bg-brand-soft rounded-lg transition-colors"
                      title="Editar"
                      aria-label={`Editar ${formatCode(prod.codigo)}`}
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEliminar(id)}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center text-brand-ink hover:text-danger hover:bg-estado-rechazado-soft rounded-lg transition-colors"
                      title="Eliminar"
                      aria-label={`Eliminar ${formatCode(prod.codigo)}`}
                    >
                      <Trash2 className="w-5 h-5" />
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
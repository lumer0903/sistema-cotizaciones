'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
import { DetalleProductoModal } from './DetalleProductoModal';
import { formatCode, formatText, formatPrice } from '@/lib/formatters';

type ProductoConImagen = ProductoInventario & {
  imagen_url?: string;
  tipo_flor?: string;
  created_at?: string;
};

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
  onMovimiento,
  onTransferencia,
  onKardex,
}: InventarioTableProps) {
  const [detalleProducto, setDetalleProducto] = useState<ProductoInventario | null>(null);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl p-12 text-center text-neutral-400 font-medium shadow-sm border border-gray-100 font-['DM_Sans']">
        Cargando inventario...
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl p-16 text-center text-neutral-400 font-medium shadow-sm border border-gray-100 font-['DM_Sans']">
        No se encontraron productos en el inventario.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>CÓDIGO</TableHead>
            <TableHead>CATEGORÍA</TableHead>
            <TableHead>UBICACIÓN</TableHead>
            <TableHead className="text-center">STOCK</TableHead>
            <TableHead className="text-center">ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((prod) => {
            const productoExt = prod as ProductoConImagen;
            const id = prod.id_producto;

            const stockVal = prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? 0;
            const ubicacion = prod.stock_actual?.[0]?.almacen?.nombre || 'ESTANTE B';
            const categoria = prod.categoria?.nombre_categoria || 'ADORNO';
            const descripcion = prod.descripcion || 'Sin descripción asignada';

            return (
              <TableRow key={id}>
                <TableCell className="font-bold text-neutral-900 font-mono text-sm">
                  {formatCode(prod.codigo)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatText(categoria)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatText(ubicacion)}
                </TableCell>
                <TableCell className="text-center font-bold text-emerald-600 text-sm">
                  {stockVal}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetalleProducto(prod)}
                      className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditar(prod)}
                      className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEliminar(id)}
                      className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
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
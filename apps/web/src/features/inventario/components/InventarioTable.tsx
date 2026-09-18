'use client';

import React, { useState } from 'react';
import { Eye, Pencil, Trash2, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

type ProductoConImagen = ProductoInventario & {
  imagen_url?: string;
  tipo_flor?: string;
  created_at?: string;
};

interface InventarioTableProps {
  productos: ProductoInventario[];
  loading?: boolean;
  onVerDetalle: (producto: ProductoInventario) => void;
  onEditar: (producto: ProductoInventario) => void;
  onEliminar: (id: number) => void;
}

export function InventarioTable({
  productos,
  loading = false,
  onVerDetalle,
  onEditar,
  onEliminar,
}: InventarioTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>CÓDIGO</TableHead>
          <TableHead>CATEGORÍA</TableHead>
          <TableHead>UBICACIÓN</TableHead>
          <TableHead className="text-center">STOCK</TableHead>
          <TableHead className="text-center">ACCIONES</TableHead>
          <TableHead className="w-10">{null}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {productos.map((prod) => {
          const productoExt = prod as ProductoConImagen;
          const id = prod.id_producto;
          const isExpanded = expandedId === id;

          const stockVal = prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? 0;
          const ubicacion = prod.stock_actual?.[0]?.almacen?.nombre || 'ESTANTE B';
          const categoria = prod.categoria?.nombre_categoria || 'ADORNO';
          const tipoFlor = productoExt.tipo_flor || 'Follaje';
          const descripcion = prod.descripcion || 'Sin descripción asignada';
          const imagenUrl = productoExt.imagen_url || prod.foto_url;
          const fechaIngreso = productoExt.created_at
            ? new Date(productoExt.created_at).toLocaleDateString('es-PE')
            : '13-08-2026';

          return (
            <React.Fragment key={id}>
              {/* Fila Principal */}
              <TableRow className={isExpanded ? 'bg-amber-50/30' : ''}>
                <TableCell className="font-bold text-neutral-900">{prod.codigo}</TableCell>
                <TableCell>{categoria}</TableCell>
                <TableCell>{ubicacion}</TableCell>
                <TableCell className="text-center font-bold text-emerald-600">{stockVal}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => onVerDetalle(prod)}
                      className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="Ver Detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    onClick={() => toggleExpand(id)}
                    className="p-1 text-neutral-500 hover:text-neutral-900 transition-colors"
                    title={isExpanded ? 'Ocultar detalles' : 'Ver detalles'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </TableCell>
              </TableRow>

              {/* Fila Desplegable con Panel de Detalle */}
              {isExpanded && (
                <TableRow className="bg-neutral-50/90 hover:bg-neutral-50/90">
                  <TableCell colSpan={6} className="p-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between font-['DM_Sans']">

                      {/* Imagen del Producto */}
                      <div className="w-28 h-28 shrink-0 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center overflow-hidden">
                        {imagenUrl ? (
                          <img
                            src={imagenUrl}
                            alt={prod.codigo}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-stone-300" />
                        )}
                      </div>

                      {/* Información en Grid */}
                      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px]">CÓDIGO</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5">{prod.codigo}</p>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px] mt-3">TIPO</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5">{tipoFlor}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px]">DESCRIPCIÓN</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5 line-clamp-2">{descripcion}</p>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px] mt-3">CATEGORÍA</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5">{categoria}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px]">UBICACIÓN</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5">{ubicacion}</p>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px] mt-3">STOCK</p>
                          <p className="text-emerald-600 font-semibold text-sm mt-0.5">{stockVal}</p>
                        </div>

                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px]">FECHA DE INGRESO</p>
                          <p className="text-neutral-700 font-light text-sm mt-0.5">{fechaIngreso}</p>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-col justify-start">
                          <p className="font-bold text-gray-400 uppercase tracking-wide text-[11px]">ACCIONES</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => onEditar(prod)}
                              className="p-1.5 rounded-lg border border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                              title="Editar producto"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEliminar(id)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                              title="Eliminar producto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
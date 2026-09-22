'use client';

import React from 'react';
import { Store, Box, Image as ImageIcon } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { ColorTags } from './ColorTags';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
import { formatCode, formatText, formatPrice } from '@/lib/formatters';
import { ProductoConsulta } from '@/features/precio-historial/types/precio';

interface DetalleProductoModalProps {
    open: boolean;
    onClose: () => void;
    producto: ProductoInventario | ProductoConsulta | null;
    tipoPrecio?: 'distribuidor' | 'tienda' | '';
    onEditar?: (p: ProductoInventario) => void;
    canEdit?: boolean;
}

export function DetalleProductoModal({
    open,
    onClose,
    producto,
    tipoPrecio = '',
    onEditar,
    canEdit = false,
}: DetalleProductoModalProps) {
    if (!producto) return null;

    // Casteo seguro a 'any' para extraer variables comunes sin conflictos de TypeScript
    const prod = producto as any;

    const stockVal = prod.stock_total ?? prod.stock_actual?.[0]?.cantidad ?? prod.stock ?? 0;
    const categoria = prod.categoria?.nombre_categoria || prod.categoria || 'ADORNO';
    const imagenUrl = prod.foto_url || prod.imagenUrl;

    // Extracción segura de precios
    const precios = prod.precios_actuales || prod.precio_actual || prod.precios || prod;

    // Precios Distribuidor
    const precioUnidadDist = Number(precios?.precio_unidad_dist ?? 0);
    const precioDocenaDist = Number(precios?.precio_docena_dist ?? 0);
    const precioMayorDist = Number(precios?.precio_mayor_dist ?? 0);

    // Precios Tienda / Normal
    const precioUnidad = Number(precios?.precio_unidad_normal ?? 0);
    const precioDocena = Number(precios?.precio_docena_normal ?? 0);
    const precioCaja = Number(precios?.precio_mayor_normal ?? 0);

    return (
        <Modal open={open} onClose={onClose} title="Ficha Técnica" maxWidth="md">
            <div className="space-y-5 pt-1">

                {/* BLOQUE SUPERIOR: Imagen + Info y Especificaciones */}
                <div className="flex gap-4 items-start">

                    {/* Imagen del producto */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-stone-100 rounded-2xl border border-stone-200 flex items-center justify-center overflow-hidden">
                        {imagenUrl ? (
                            <img
                                src={getImageUrl(imagenUrl, '200')}
                                alt={prod.codigo}
                                className="w-full h-full object-cover"
                                onError={(e) => handleImageError(e, '200')}
                            />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-stone-300" />
                        )}
                    </div>

                    {/* Lado derecho: Código, Stock y Especificaciones */}
                    <div className="flex-1 space-y-2.5 min-w-0">
                        {/* Cabecera con Código y Stock */}
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Código Producto</span>
                                <h3 className="text-lg sm:text-xl font-black text-brand-subtitle leading-none mt-0.5">
                                    {formatCode(prod.codigo)}
                                </h3>
                            </div>

                            <div
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold shrink-0 ${stockVal <= (prod.stock_minimo || 0)
                                    ? 'bg-orange-100 text-orange-600'
                                    : 'bg-green-100 text-green-700'
                                    }`}
                            >
                                <Box className="w-4 h-4" /> {stockVal} u.
                            </div>
                        </div>

                        {/* ESPECIFICACIONES TÉCNICAS */}
                        <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Categoría</span>
                                    <span className="text-xs font-semibold text-brand-subtitle truncate block">
                                        {formatText(categoria)}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Tipo Flor</span>
                                    <span className="text-xs font-semibold text-brand-subtitle truncate block">{prod.tipo_flor || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Material</span>
                                    <span className="text-xs font-semibold text-brand-subtitle truncate block">{prod.material || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-gray-400 uppercase font-bold">Presentación</span>
                                    <span className="text-xs font-semibold text-brand-subtitle truncate block">{prod.presentacion || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOQUE INFERIOR: Precios / Almacén / Colores */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

                    {/* COLUMNA IZQUIERDA: PRECIOS */}
                    <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Precios y Costos
                        </h4>
                        <div className="flex flex-col gap-2">
                            {/* BLOQUE PRECIO DISTRIBUIDOR */}
                            {(tipoPrecio === '' || tipoPrecio === 'distribuidor') && (
                                <div className="w-full p-1 bg-orange-50/60 border border-orange-200/80 rounded-2xl flex flex-col items-center gap-1.5">
                                    <span className="text-orange-700 text-[8px] font-black tracking-wider uppercase">
                                        Precio Distribuidor
                                    </span>

                                    <div className="w-full grid grid-cols-3 text-center gap-1">
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Unidad</span>
                                            <span className="text-orange-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioUnidadDist)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Docena</span>
                                            <span className="text-orange-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioDocenaDist)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Caja / Mayor</span>
                                            <span className="text-orange-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioMayorDist)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BLOQUE PRECIO TIENDA */}
                            {(tipoPrecio === '' || tipoPrecio === 'tienda') && (
                                <div className="w-full p-1 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex flex-col items-center gap-1.5">
                                    <span className="text-blue-700 text-[8px] font-black tracking-wider uppercase">
                                        Precio Tienda
                                    </span>

                                    <div className="w-full grid grid-cols-3 text-center gap-1">
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Unidad</span>
                                            <span className="text-blue-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioUnidad)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Docena</span>
                                            <span className="text-blue-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioDocena)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-[8px] font-bold uppercase">Caja / Mayor</span>
                                            <span className="text-blue-950 text-xs font-bold font-mono mt-0.5">
                                                {formatPrice(precioCaja)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: ALMACÉN Y COLORES */}
                    <div className="flex flex-col gap-4">
                        {/* ALMACENES */}
                        <div>
                            <h4 className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">
                                Ubicación y Stock por Almacén
                            </h4>
                            <div className="space-y-1.5">
                                {prod.stock_actual && prod.stock_actual.length > 0 ? (
                                    prod.stock_actual.map((st: any) => (
                                        <div
                                            key={st.id_almacen}
                                            className="flex items-center justify-between px-3.5 py-2 bg-white border border-gray-200/80 rounded-xl"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Store className="w-4 h-4 text-brand-primary shrink-0" />
                                                <span className="text-xs font-bold text-brand-subtitle truncate">
                                                    {formatText(st.almacen?.nombre || '')}
                                                </span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-brand-subtitle shrink-0">
                                                {st.cantidad} u.
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-brand-options italic">Sin registros de almacén asignados.</p>
                                )}
                            </div>
                        </div>

                        {/* COLORES */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Colores disponibles
                            </h4>
                            {prod.colores_surtido && prod.colores_surtido.length > 0 ? (
                                <ColorTags colors={prod.colores_surtido} maxVisible={10} size="sm" />
                            ) : (
                                <p className="text-xs text-brand-options italic">Sin colores asignados.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={onClose}
                    >
                        Cerrar
                    </Button>
                    {canEdit && onEditar && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                onClose();
                                onEditar(prod as ProductoInventario);
                            }}
                        >
                            Editar Producto
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
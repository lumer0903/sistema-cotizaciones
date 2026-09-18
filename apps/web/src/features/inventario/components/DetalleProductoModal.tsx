'use client';

import React from 'react';
import { Package, Store, Tag, Box, Layers, Palette } from 'lucide-react';
import { Modal, Badge, Button } from '@/components/ui';
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { ColorTags } from './ColorTags';

interface DetalleProductoModalProps {
    open: boolean;
    onClose: () => void;
    producto: ProductoInventario | null;
    onEditar?: (p: ProductoInventario) => void;
    canEdit?: boolean;
}

export function DetalleProductoModal({
    open,
    onClose,
    producto,
    onEditar,
    canEdit = false,
}: DetalleProductoModalProps) {
    if (!producto) return null;

    return (
        <Modal open={open} onClose={onClose} title={`Ficha Técnica: ${producto.codigo}`} maxWidth="lg">
            <div className="space-y-6">
                {/* TITULAR Y BADGES DE ESTADO */}
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-brand-subtitle">{producto.descripcion}</h3>
                        <p className="text-xs text-brand-options mt-0.5">
                            Código Único: <span className="font-mono font-bold text-brand-subtitle">{producto.codigo}</span>
                        </p>
                    </div>
                    <Badge variant={producto.stock_total <= producto.stock_minimo ? 'warning' : 'success'}>
                        Stock Total: {producto.stock_total} u.
                    </Badge>
                </div>

                {/* ESPECIFICACIONES TÉCNICAS */}
                <div>
                    <h4 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3">
                        Especificaciones Técnicas
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-200/80">
                        <div>
                            <span className="block text-[10px] text-brand-options uppercase font-bold">Categoría</span>
                            <span className="text-xs font-semibold text-brand-subtitle">
                                {producto.categoria?.nombre_categoria || 'Sin asignación'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-brand-options uppercase font-bold">Tipo Flor</span>
                            <span className="text-xs font-semibold text-brand-subtitle">{producto.tipo_flor || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-brand-options uppercase font-bold">Material</span>
                            <span className="text-xs font-semibold text-brand-subtitle">{producto.material || '-'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] text-brand-options uppercase font-bold">Presentación</span>
                            <span className="text-xs font-semibold text-brand-subtitle">{producto.presentacion || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* COLORES Y SURTIDO */}
                {producto.colores_surtido && producto.colores_surtido.length > 0 && (
                    <div>
                        <h4 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-2">
                            Colores Disponibles en Caja Surtida
                        </h4>
                        <ColorTags colors={producto.colores_surtido} maxVisible={10} size="md" />
                    </div>
                )}

                {/* DISPONIBILIDAD POR ALMACÉN */}
                <div>
                    <h4 className="text-xs font-bold text-brand-options uppercase tracking-wider mb-3">
                        Ubicación y Stock por Almacén
                    </h4>
                    <div className="space-y-2">
                        {producto.stock_actual && producto.stock_actual.length > 0 ? (
                            producto.stock_actual.map((st) => (
                                <div
                                    key={st.id_almacen}
                                    className="flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200/80 rounded-xl"
                                >
                                    <div className="flex items-center gap-2">
                                        <Store className="w-4 h-4 text-brand-primary" />
                                        <span className="text-xs font-bold text-brand-subtitle">{st.almacen?.nombre}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-brand-subtitle">
                                        {st.cantidad} unidades
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-brand-options italic">Sin registros de almacén asignados.</p>
                        )}
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    {canEdit && onEditar && (
                        <Button
                            variant="primary"
                            onClick={() => {
                                onClose();
                                onEditar(producto);
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
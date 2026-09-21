'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, TrendingUp, Scale, X, Plus, RotateCcw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Modal, Button, Badge } from '@/components/ui';
import { obtenerRecomendacionesItem, RecomendarItemRequest, RecomendacionItem, RecomendarItemResponse } from '../api/cotizacionApi';

interface RecomendacionesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    productoBase: { id: number; codigo: string; descripcion: string } | null;
    tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
    idCliente?: number;
    idAlmacen?: number;
    onAgregar: (item: RecomendacionItem, tipo: 'similar' | 'upsell' | 'equilibrio') => void;
    onReemplazar?: (itemExistenteId: string, nuevoItem: RecomendacionItem, tipo: 'similar' | 'upsell' | 'equilibrio') => void;
    itemExistenteId?: string | null;
}

const TIPO_CONFIG = {
    similar: { label: 'SIMILAR', icon: Zap, color: 'bg-blue-100 text-blue-700 border-blue-300', desc: 'Productos parecidos al seleccionado' },
    upsell: { label: 'UPSELL', icon: TrendingUp, color: 'bg-amber-100 text-amber-700 border-amber-300', desc: 'Alternativas de mayor valor/margen' },
    equilibrio: { label: 'EQUILIBRIO', icon: Scale, color: 'bg-emerald-100 text-emerald-700 border-emerald-300', desc: 'Mejor relación precio-calidad' },
} as const;

export function RecomendacionesPanel({
    isOpen,
    onClose,
    productoBase,
    tipoPrecioCliente,
    idCliente,
    idAlmacen,
    onAgregar,
    onReemplazar,
    itemExistenteId,
}: RecomendacionesPanelProps) {
    const [recomendaciones, setRecomendaciones] = useState<RecomendarItemResponse>({ similar: [], upsell: [], equilibrio: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'similar' | 'upsell' | 'equilibrio'>('similar');

    const fetchRecomendaciones = useCallback(async () => {
        if (!productoBase) return;
        setLoading(true);
        setError(null);
try {
                const request: RecomendarItemRequest = {
                    id_producto_base: productoBase.id,
                    id_cliente: idCliente,
                    id_almacen: idAlmacen,
                };
                const data = await obtenerRecomendacionesItem(request);
                setRecomendaciones(data);
            } catch (err: any) {
            console.error('Error fetching recomendaciones:', err);
            setError(err.message || 'Error al obtener recomendaciones');
            toast.error('No se pudieron cargar las recomendaciones IA');
        } finally {
            setLoading(false);
        }
    }, [productoBase, idCliente, idAlmacen]);

    useEffect(() => {
        if (isOpen && productoBase) {
            fetchRecomendaciones();
        }
    }, [isOpen, productoBase, fetchRecomendaciones]);

    const currentItems = recomendaciones[activeTab];
    const config = TIPO_CONFIG[activeTab];
    const Icon = config.icon;

    const handleAgregar = (item: RecomendacionItem) => {
        onAgregar(item, activeTab);
        toast.success(`${config.label} agregado al carrito`);
    };

    const handleReemplazar = (item: RecomendacionItem) => {
        if (itemExistenteId && onReemplazar) {
            onReemplazar(itemExistenteId, item, activeTab);
            toast.success(`Reemplazado por ${config.label}`);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal open={isOpen} onClose={onClose} title={`Recomendaciones IA: ${productoBase?.codigo || ''}`} maxWidth="xl">
            <div className="space-y-4">
                {!productoBase ? (
                    <div className="text-center py-8 text-zinc-400">
                        <p className="text-sm">Selecciona un producto del carrito para ver recomendaciones</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-8 text-red-600">
                        <p className="text-sm">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchRecomendaciones} className="mt-2">
                            <RotateCcw className="w-4 h-4 mr-1" /> Reintentar
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* TABS */}
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                            {(['similar', 'upsell', 'equilibrio'] as const).map((tab) => {
                                const tConfig = TIPO_CONFIG[tab];
                                const TIcon = tConfig.icon;
                                const count = recomendaciones[tab]?.length || 0;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                            activeTab === tab
                                                ? 'bg-white shadow-sm text-brand-subtitle'
                                                : 'text-brand-options hover:text-brand-subtitle'
                                        }`}
                                    >
                                        <TIcon className="w-3.5 h-3.5" />
                                        {tConfig.label} <span className="px-1.5 py-0.5 text-[10px] bg-brand-primary/10 text-brand-primary rounded-full">{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* DESCRIPCIÓN DEL TIPO */}
                        <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 flex items-center gap-2">
                            <Icon className="w-4 h-4 text-brand-primary" />
                            <p className="text-xs text-brand-options">{config.desc}</p>
                        </div>

                        {/* CONTENIDO */}
                        {loading ? (
                            <div className="p-8 text-center text-brand-options text-sm animate-pulse">
                                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-primary" />
                                Analizando con IA y consultando precios/stock...
                            </div>
                        ) : currentItems.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                                <Icon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-xs font-semibold text-brand-options">No hay recomendaciones de este tipo</p>
                                <p className="text-[11px] text-brand-options mt-1">Intenta con otro producto o ajusta los filtros</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                                {currentItems.map((item, index) => (
                                    <RecomendacionCard
                                        key={`${activeTab}-${item.id_producto}-${index}`}
                                        item={item}
                                        config={config}
                                        onAgregar={() => handleAgregar(item)}
                                        onReemplazar={() => handleReemplazar(item)}
                                        showReemplazar={!!itemExistenteId && !!onReemplazar}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* FOOTER INFO */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-brand-options">
                    <span>Precios según tipo: <strong>{tipoPrecioCliente}</strong> | Stock consultado en almacén seleccionado</span>
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

interface RecomendacionCardProps {
    item: RecomendacionItem;
    config: { label: string; color: string; icon: React.ComponentType<{ className?: string }> };
    onAgregar: () => void;
    onReemplazar: () => void;
    showReemplazar: boolean;
}

function RecomendacionCard({ item, config, onAgregar, onReemplazar, showReemplazar }: RecomendacionCardProps) {
    const Icon = config.icon;
    return (
        <div className={`border ${config.color.replace('bg-', 'border-').replace('text-', '')} rounded-lg p-3 bg-white hover:shadow-md transition-shadow relative`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <Badge variant="brand" className={`text-[10px] ${config.color}`}>
                        {config.label}
                    </Badge>
                </div>
                <span className="text-[10px] text-brand-options font-mono">{item.codigo}</span>
            </div>

            <p className="text-xs font-medium text-brand-subtitle line-clamp-2 mb-2">{item.descripcion}</p>

            <div className="flex items-center gap-2 text-[10px] text-brand-options mb-3">
                {item.categoria && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{item.categoria}</span>}
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">Stock: {item.stock}</span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">S/ {item.precio.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-brand-options mb-2">
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">Similitud: {(item.similarityScore * 100).toFixed(0)}%</span>
                {item.margen !== undefined && (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">Margen: {item.margen.toFixed(1)}%</span>
                )}
            </div>

            <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-[10px] py-1.5"
                    onClick={onAgregar}
                >
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar
                </Button>
                {showReemplazar && (
                    <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 text-[10px] py-1.5"
                        onClick={onReemplazar}
                    >
                        <ArrowRight className="w-3 h-3 mr-1" />
                        Reemplazar
                    </Button>
                )}
            </div>
        </div>
    );
}
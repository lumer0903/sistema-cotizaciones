'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Zap, TrendingUp, Scale, Plus, RotateCcw, ArrowRight, Sparkles, MessageSquare } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button, Badge } from '@/components/ui';
import { obtenerRecomendacionesItem, RecomendarItemRequest, RecomendacionItem, RecomendarItemResponse } from '../api/cotizacionApi';
import { formatCode } from '@/lib/formatters';

export type TipoRecomendacion = 'similar' | 'upsell' | 'equilibrio';

export interface ProductoBaseRecomendacion {
    id: number;
    codigo: string;
    descripcion: string;
}

export interface SidebarCartItem {
    id: string;
    id_producto?: number;
    codigo: string;
    descripcion: string;
}

interface RecomendacionesPanelProps {
    /** Items del carrito */
    cartItems: SidebarCartItem[];
    /** ID del item seleccionado vía el botón de ACCIONES. Sin selección no se consulta la IA */
    selectedItemId?: string | null;
    tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
    idCliente?: number;
    idAlmacen?: number;
    /** ID del item existente para habilitar "Reemplazar" (normalmente = producto base del carrito) */
    itemExistenteId?: string | null;
    /** Incrementar para forzar recarga (cada clic en el botón de ACCIONES lo incrementa) */
    refreshKey?: number;
    onAgregar: (item: RecomendacionItem, tipo: TipoRecomendacion) => void;
    onReemplazar?: (itemExistenteId: string, nuevoItem: RecomendacionItem, tipo: TipoRecomendacion) => void;
}

export const TIPO_CONFIG = {
    similar: { label: 'SIMILAR', icon: Zap, color: 'bg-estado-enviado-soft text-estado-enviado border-estado-enviado/40', desc: 'Productos parecidos al seleccionado' },
    upsell: { label: 'UPSELL', icon: TrendingUp, color: 'bg-brand-soft text-brand-subtitle border border-brand-primary/40', desc: 'Alternativas de mayor valor/margen' },
    equilibrio: { label: 'EQUILIBRIO', icon: Scale, color: 'bg-estado-aprobado-soft text-estado-aprobado-text border-estado-aprobado/40', desc: 'Mejor relación precio-calidad' },
} as const;

export function normalizeRecomendaciones(raw: any): RecomendarItemResponse {
    const src = raw?.data && (raw.data.similar || raw.data.upsell || raw.data.equilibrio) ? raw.data : raw;
    const asArray = (v: any) => (Array.isArray(v) ? v : []);
    return {
        similar: asArray(src?.similar),
        upsell: asArray(src?.upsell),
        equilibrio: asArray(src?.equilibrio),
    };
}

export interface UseRecomendacionesOptions {
    idCliente?: number;
    idAlmacen?: number;
    tipoPrecioCliente?: 'DISTRIBUIDOR' | 'TIENDA';
    /** Si false, no dispara el fetch automáticamente */
    enabled?: boolean;
    /** Si true, no muestra toast en errores (el consumidor muestra el error inline) */
    silent?: boolean;
    /** Si true, limpia las listas cuando no hay producto base válido */
    resetWhenEmpty?: boolean;
    /** Incrementar para forzar un refetch (p. ej. clic repetido en el mismo producto) */
    refreshKey?: number;
}

/**
 * Hook compartido para consultar recomendaciones IA.
 * Envía `tipo_precio` según el tipo de cliente activo para que el backend
 * calcule los precios correctos (tienda/distribuidor).
 */
export function useRecomendaciones(
    productoBase: ProductoBaseRecomendacion | null,
    options: UseRecomendacionesOptions = {},
) {
    const {
        idCliente,
        idAlmacen,
        tipoPrecioCliente = 'TIENDA',
        enabled = true,
        silent = false,
        resetWhenEmpty = true,
        refreshKey = 0,
    } = options;

    const baseId = productoBase?.id ?? 0;

    const [recomendaciones, setRecomendaciones] = useState<RecomendarItemResponse>({ similar: [], upsell: [], equilibrio: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Evita que una respuesta tardía de una base anterior sobrescriba la base actual
    const seqRef = React.useRef(0);

    const fetchRecomendaciones = useCallback(async () => {
        if (!productoBase || !productoBase.id) {
            if (resetWhenEmpty) setRecomendaciones({ similar: [], upsell: [], equilibrio: [] });
            setError('El item no tiene producto válido para recomendar');
            return;
        }
        const seq = ++seqRef.current;
        setLoading(true);
        setError(null);
        try {
            const request: RecomendarItemRequest = {
                id_producto_base: productoBase.id,
                id_cliente: idCliente,
                id_almacen: idAlmacen,
                tipo_precio: tipoPrecioCliente === 'DISTRIBUIDOR' ? 'distribuidor' : 'normal',
            };
            const data = await obtenerRecomendacionesItem(request);
            if (seqRef.current !== seq) return; // respuesta obsoleta: ignorar
            setRecomendaciones(normalizeRecomendaciones(data));
        } catch (err: any) {
            if (seqRef.current !== seq) return; // respuesta obsoleta: ignorar
            console.error('Error fetching recomendaciones:', err);
            setError(err.message || 'Error al obtener recomendaciones');
            if (!silent) showToast.error('No se pudieron cargar las recomendaciones IA');
        } finally {
            if (seqRef.current === seq) setLoading(false);
        }
    }, [baseId, idCliente, idAlmacen, tipoPrecioCliente, silent, resetWhenEmpty, refreshKey]);

    useEffect(() => {
        if (enabled && productoBase?.id) {
            fetchRecomendaciones();
        } else if (enabled && resetWhenEmpty && !productoBase?.id) {
            setRecomendaciones({ similar: [], upsell: [], equilibrio: [] });
            setError(null);
        }
    }, [enabled, baseId, fetchRecomendaciones]);

    return { recomendaciones, loading, error, refetch: fetchRecomendaciones };
}

/**
 * Panel lateral de recomendaciones IA (sin modal).
 * - Solo consulta la IA cuando hay un producto seleccionado vía el botón de ACCIONES.
 * - Agregar productos al carrito NO dispara recomendaciones.
 */
export function RecomendacionesPanel({
    cartItems,
    selectedItemId,
    tipoPrecioCliente,
    idCliente,
    idAlmacen,
    itemExistenteId,
    refreshKey = 0,
    onAgregar,
    onReemplazar,
}: RecomendacionesPanelProps) {
    const [activeTab, setActiveTab] = useState<TipoRecomendacion>('similar');

    const baseItem: SidebarCartItem | undefined = useMemo(() => {
        if (!selectedItemId) return undefined;
        return cartItems.find((i) => i.id === selectedItemId);
    }, [cartItems, selectedItemId]);

    const productoBase = useMemo(
        () =>
            baseItem && Number(baseItem.id_producto ?? 0) > 0
                ? { id: Number(baseItem.id_producto), codigo: baseItem.codigo, descripcion: baseItem.descripcion }
                : null,
        [baseItem?.id, baseItem?.id_producto, baseItem?.codigo, baseItem?.descripcion],
    );

    const { recomendaciones, loading, error, refetch } = useRecomendaciones(productoBase, {
        idCliente,
        idAlmacen,
        tipoPrecioCliente,
        enabled: !!productoBase,
        silent: true,
        refreshKey,
    });

    const currentItems = Array.isArray(recomendaciones?.[activeTab]) ? recomendaciones[activeTab] : [];
    const config = TIPO_CONFIG[activeTab];
    const Icon = config.icon;
    const baseCartId = itemExistenteId ?? baseItem?.id ?? null;

    const handleAgregar = (item: RecomendacionItem) => {
        onAgregar(item, activeTab);
        showToast.success(`${config.label} agregado al carrito`);
    };

    const handleReemplazar = (item: RecomendacionItem) => {
        if (baseCartId && onReemplazar) {
            onReemplazar(baseCartId, item, activeTab);
            showToast.success(`Reemplazado por ${config.label}`);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200/80">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-zinc-700">RECOMENDACIONES</h3>
                {productoBase && (
                    <span className="text-[10px] font-bold font-mono uppercase px-2 py-1 rounded-lg bg-brand-selection text-brand-primary border border-brand-modalFocus">
                        BASE: {formatCode(productoBase.codigo)}
                    </span>
                )}
            </div>

            {cartItems.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 space-y-2">
                    <Sparkles className="size-7 mx-auto text-brand-primary opacity-80" />
                    <p className="text-xs font-medium">Agrega un producto al carrito para ver sugerencias de IA</p>
                </div>
            ) : !baseItem ? (
                <div className="text-center py-10 text-zinc-400 space-y-2">
                    <MessageSquare className="size-7 mx-auto text-brand-primary opacity-80" />
                    <p className="text-xs font-medium">Haz clic en el icono de mensaje de un producto para ver sugerencias</p>
                </div>
            ) : !productoBase ? (
                <div className="text-center py-8 text-zinc-400">
                    <p className="text-xs font-medium">El producto seleccionado no tiene ID válido para recomendar</p>
                </div>
            ) : error ? (
                <div className="text-center py-6 text-red-600">
                    <p className="text-xs">{error}</p>
                    <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reintentar
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* TABS */}
                    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {(['similar', 'upsell', 'equilibrio'] as const).map((tab) => {
                            const tConfig = TIPO_CONFIG[tab];
                            const TIcon = tConfig.icon;
                            const count = recomendaciones[tab]?.length || 0;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                                        activeTab === tab
                                            ? 'bg-white shadow-sm text-brand-subtitle'
                                            : 'text-brand-options hover:text-brand-subtitle'
                                    }`}
                                >
                                    <TIcon className="w-3 h-3" />
                                    {tConfig.label}
                                    <span className="px-1 py-0.5 text-[9px] bg-brand-primary/10 text-brand-primary rounded-full">{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* CONTENIDO */}
                    {loading ? (
                        <div className="py-8 text-center text-brand-options text-xs animate-pulse">
                            <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-brand-primary" />
                            Analizando con IA y consultando precios/stock...
                        </div>
                    ) : currentItems.length === 0 ? (
                        <div className="py-6 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                            <Icon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-[11px] font-semibold text-brand-options">No hay recomendaciones de este tipo</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                            {currentItems.map((item, index) => (
                                <RecomendacionCard
                                    key={`${activeTab}-${item.id_producto}-${index}`}
                                    item={item}
                                    config={config}
                                    onAgregar={() => handleAgregar(item)}
                                    onReemplazar={() => handleReemplazar(item)}
                                    showReemplazar={!!baseCartId && !!onReemplazar}
                                />
                            ))}
                        </div>
                    )}

                    <p className="text-[10px] text-zinc-400 text-right">
                        Precios según: <strong>{tipoPrecioCliente}</strong>
                    </p>
                </div>
            )}
        </div>
    );
}

export interface RecomendacionCardProps {
    item: RecomendacionItem;
    config: { label: string; color: string; icon: React.ComponentType<{ className?: string }> };
    onAgregar: () => void;
    onReemplazar: () => void;
    showReemplazar: boolean;
}

export function RecomendacionCard({ item, config, onAgregar, onReemplazar, showReemplazar }: RecomendacionCardProps) {
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
                <span className="text-[10px] text-brand-options font-mono uppercase">{formatCode(item.codigo)}</span>
            </div>

            <p className="text-xs font-medium text-brand-subtitle line-clamp-2 mb-2">{item.descripcion}</p>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-brand-options mb-2">
                {item.categoria && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{item.categoria}</span>}
                <span className="px-1.5 py-0.5 bg-brand-soft text-brand-subtitle border border-brand-primary/40 rounded">Stock: {item.stock}</span>
                <span className="px-1.5 py-0.5 bg-estado-aprobado-soft text-estado-aprobado-text border border-estado-aprobado/30 rounded">S/ {Number(item.precio ?? 0).toFixed(2)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-brand-options mb-3">
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded">Almacén: {(item as any).almacen || '—'}</span>
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-700 border border-stone-200 rounded">Ubicación: {(item as any).ubicacion || '—'}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-brand-options mb-2">
                <span className="px-1.5 py-0.5 bg-estado-enviado-soft text-estado-enviado border border-estado-enviado/30 rounded">Similitud: {(item.similarityScore * 100).toFixed(0)}%</span>
                {item.margen !== undefined && (
                    <span className="px-1.5 py-0.5 bg-estado-aprobado-soft text-estado-aprobado-text border border-estado-aprobado/30 rounded">Margen: {item.margen.toFixed(1)}%</span>
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

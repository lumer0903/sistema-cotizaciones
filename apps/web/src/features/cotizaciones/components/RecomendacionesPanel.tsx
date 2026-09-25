'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Loader2,
    Zap,
    TrendingUp,
    Scale,
    Plus,
    Minus,
    RotateCcw,
    Sparkles,
    MessageSquare,
    MapPin,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui';
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
    /** Incrementar para forzar recarga */
    refreshKey?: number;
    onAgregar: (item: RecomendacionItem, tipo: TipoRecomendacion) => void;
    onReemplazar?: (itemExistenteId: string, nuevoItem: RecomendacionItem, tipo: TipoRecomendacion) => void;
}

export const TIPO_CONFIG = {
    similar: {
        label: 'SIMILAR',
        icon: Zap,
        badgeBg: 'bg-blue-600',
        activeTabBg: 'bg-blue-600 text-white shadow-sm',
        inactiveTabBg: 'bg-gray-100 text-zinc-600 hover:bg-gray-200',
        containerBg: 'bg-blue-50/30',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        desc: 'Productos parecidos al seleccionado',
    },
    equilibrio: {
        label: 'EQUILIBRIO',
        icon: Scale,
        badgeBg: 'bg-emerald-600',
        activeTabBg: 'bg-emerald-600 text-white shadow-sm',
        inactiveTabBg: 'bg-gray-100 text-zinc-600 hover:bg-gray-200',
        containerBg: 'bg-emerald-50/30',
        borderColor: 'border-emerald-200',
        textColor: 'text-emerald-700',
        desc: 'Mejor relación precio-calidad',
    },
    upsell: {
        label: 'MEJOR OPCIÓN',
        icon: TrendingUp,
        badgeBg: 'bg-amber-500',
        activeTabBg: 'bg-amber-500 text-white shadow-sm',
        inactiveTabBg: 'bg-gray-100 text-zinc-600 hover:bg-gray-200',
        containerBg: 'bg-amber-50/30',
        borderColor: 'border-amber-200',
        textColor: 'text-amber-600',
        desc: 'Alternativas de mayor valor/margen',
    },
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
    enabled?: boolean;
    silent?: boolean;
    resetWhenEmpty?: boolean;
    refreshKey?: number;
}

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

    const [recomendaciones, setRecomendaciones] = useState<RecomendarItemResponse>({
        similar: [],
        upsell: [],
        equilibrio: [],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            if (seqRef.current !== seq) return;
            setRecomendaciones(normalizeRecomendaciones(data));
        } catch (err: any) {
            if (seqRef.current !== seq) return;
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
 * Panel lateral de recomendaciones IA con pestañas y botón minimizador idéntico al panel RESUMEN.
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
    const [isMinimized, setIsMinimized] = useState(false);
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

    const baseCartId = itemExistenteId ?? baseItem?.id ?? null;

    const handleAgregar = (item: RecomendacionItem, tipo: TipoRecomendacion) => {
        onAgregar(item, tipo);
        showToast.success(`${TIPO_CONFIG[tipo].label} agregado al carrito`);
    };

    const handleReemplazar = (item: RecomendacionItem, tipo: TipoRecomendacion) => {
        if (baseCartId && onReemplazar) {
            onReemplazar(baseCartId, item, tipo);
            showToast.success(`Reemplazado por ${TIPO_CONFIG[tipo].label}`);
        }
    };

    const tipos: TipoRecomendacion[] = ['similar', 'equilibrio', 'upsell'];
    const currentList = recomendaciones[activeTab] || [];
    const activeConfig = TIPO_CONFIG[activeTab];

    return (
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300">
            {/* CABECERA PRINCIPAL */}
            <div className={`p-4 flex items-center justify-between ${!isMinimized ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-zinc-700 tracking-wide font-['DM_Sans']">
                            RECOMENDACIONES
                        </h3>
                        {productoBase && !isMinimized && (
                            <span className="text-[10px] font-mono text-zinc-400">
                                BASE: {formatCode(productoBase.codigo)}
                            </span>
                        )}
                    </div>
                </div>

                {/* BOTÓN MINIMIZAR / MAXIMIZAR (Igual al panel RESUMEN) */}
                <button
                    type="button"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors text-amber-500"
                    title={isMinimized ? 'Expandir' : 'Minimizar'}
                >
                    {isMinimized ? (
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                        <Minus className="w-5 h-5 stroke-[2.5]" />
                    )}
                </button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            {!isMinimized && (
                <>
                    {/* NAVEGACIÓN POR TABS */}
                    <div className="p-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between gap-1">
                        {tipos.map((tipo) => {
                            const cfg = TIPO_CONFIG[tipo];
                            const isActive = activeTab === tipo;
                            const count = (recomendaciones[tipo] || []).length;

                            return (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setActiveTab(tipo)}
                                    className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-extrabold font-['DM_Sans'] tracking-wider transition-all flex items-center justify-center gap-1 ${isActive ? cfg.activeTabBg : cfg.inactiveTabBg
                                        }`}
                                >
                                    <span>{cfg.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`px-1 py-0.2 text-[9px] rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-zinc-700'
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* LISTADO */}
                    <div className="p-4 space-y-4 max-h-[550px] overflow-y-auto">
                        {cartItems.length === 0 ? (
                            <div className="text-center py-10 text-zinc-400 space-y-2">
                                <Sparkles className="size-7 mx-auto text-amber-500 opacity-80" />
                                <p className="text-xs font-medium">Agrega un producto al carrito para ver sugerencias de IA</p>
                            </div>
                        ) : !baseItem ? (
                            <div className="text-center py-10 text-zinc-400 space-y-2">
                                <MessageSquare className="size-7 mx-auto text-amber-500 opacity-80" />
                                <p className="text-xs font-medium">
                                    Haz clic en el icono de mensaje de un producto para ver sugerencias
                                </p>
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
                        ) : loading ? (
                            <div className="py-12 text-center text-zinc-400 text-xs animate-pulse">
                                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-500" />
                                Analizando con IA y consultando precios/stock...
                            </div>
                        ) : currentList.length === 0 ? (
                            <div className="text-center py-8 text-zinc-400">
                                <p className="text-xs">No hay productos en la categoría <strong>{activeConfig.label}</strong></p>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-xl border ${activeConfig.borderColor} ${activeConfig.containerBg} space-y-3`}>

                                <div className="space-y-3">
                                    {currentList.map((item, idx) => (
                                        <RecomendacionCardSection
                                            key={`${activeTab}-${item.id_producto}-${idx}`}
                                            item={item}
                                            tipo={activeTab}
                                            config={activeConfig}
                                            onAgregar={() => handleAgregar(item, activeTab)}
                                            onReemplazar={() => handleReemplazar(item, activeTab)}
                                            showReemplazar={!!baseCartId && !!onReemplazar}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-[10px] text-zinc-400 text-right pt-1 border-t border-gray-100">
                            Precios según: <strong>{tipoPrecioCliente}</strong>
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

export interface RecomendacionCardSectionProps {
    item: RecomendacionItem;
    tipo: TipoRecomendacion;
    config: typeof TIPO_CONFIG[TipoRecomendacion];
    onAgregar: () => void;
    onReemplazar: () => void;
    showReemplazar: boolean;
}

export function RecomendacionCardSection({
    item,
    onAgregar,
    onReemplazar,
    showReemplazar,
}: RecomendacionCardSectionProps) {
    const imagenUrl = (item as any).imagen_url || (item as any).imagen || 'https://placehold.co/81x69?text=Sin+Imagen';

    return (
        <div className="bg-white rounded-lg border border-gray-200/80 p-2.5 shadow-sm space-y-2.5">
            {/* DETALLES DE PRODUCTO */}
            <div className="flex gap-2.5 items-start">
                {/* IMAGEN */}
                <div className="w-20 h-20 rounded-md border border-amber-400 flex-shrink-0 overflow-hidden bg-gray-50 flex items-center justify-center">
                    <img src={imagenUrl} alt={item.descripcion} className="w-full h-full object-cover" />
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="inline-block px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-700 font-bold text-[10px] font-['DM_Sans'] border border-zinc-200">
                        {formatCode(item.codigo)}
                    </div>

                    <p className="text-[11px] font-normal text-zinc-900 line-clamp-2 leading-tight font-['Inter']">
                        {item.descripcion}
                    </p>

                    <div className="flex flex-wrap items-center gap-1 text-[9px] pt-0.5 font-['DM_Sans']">
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-200/60 rounded font-semibold">
                            S/ {Number(item.precio ?? 0).toFixed(2)}
                        </span>

                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            {item.stock}
                        </span>

                        {((item as any).almacen || (item as any).ubicacion) && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 border border-neutral-200/80 rounded flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-neutral-400" />
                                {(item as any).ubicacion || (item as any).almacen}
                            </span>
                        )}

                        {item.similarityScore !== undefined && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded">
                                Sim: {(item.similarityScore * 100).toFixed(0)}%
                            </span>
                        )}

                        {item.margen !== undefined && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded">
                                Mg: {item.margen.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ACCIONES */}
            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onAgregar}
                    className="px-3 py-1.5 text-[10px] font-black font-['DM_Sans'] text-zinc-500 hover:text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors uppercase tracking-wider flex items-center gap-1"
                >
                    <Plus className="w-3 h-3" />
                    AGREGAR
                </button>

                {showReemplazar && (
                    <button
                        type="button"
                        onClick={onReemplazar}
                        className="px-3 py-1.5 text-[10px] font-black font-['DM_Sans'] text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400 rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1"
                    >
                        REEMPLAZAR
                    </button>
                )}
            </div>
        </div>
    );
}

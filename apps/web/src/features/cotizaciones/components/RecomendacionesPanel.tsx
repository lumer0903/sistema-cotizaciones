'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
    Loader2,
    Zap,
    TrendingUp,
    Scale,
    Plus,
    Minus,
    RotateCcw,
    Sparkles,
    Package,
    Archive,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui';
import { getImageUrl } from '@/lib/imageUtils';
import { obtenerRecomendacionesItem, RecomendarItemRequest, RecomendacionItem, RecomendarItemResponse } from '../api/cotizacionApi';
import { formatCode } from '@/lib/formatters';
import type { ProductoBase } from './AgregarProductoModal';

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
    /** Catálogo ya cargado del formulario: permite resolver la imagen de cada recomendación en cliente */
    productosCatalogo?: ProductoBase[];
    /** El usuario pulsó AGREGAR: el contenedor decide (p.ej. abrir el modal de confirmación) */
    onSelectAgregar: (item: RecomendacionItem, tipo: TipoRecomendacion) => void;
    /** El usuario pulsó REEMPLAZAR sobre el item base seleccionado */
    onSelectReemplazar?: (itemExistenteId: string, nuevoItem: RecomendacionItem, tipo: TipoRecomendacion) => void;
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
        if (!baseId) {
            if (resetWhenEmpty) setRecomendaciones({ similar: [], upsell: [], equilibrio: [] });
            setError('El item no tiene producto válido para recomendar');
            return;
        }
        const seq = ++seqRef.current;
        setLoading(true);
        setError(null);
        try {
            const request: RecomendarItemRequest = {
                id_producto_base: baseId,
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
        // refreshKey es un nonce del padre: solo aporta identidad al callback
        // para que el efecto dispare de nuevo el fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseId, idCliente, idAlmacen, tipoPrecioCliente, silent, resetWhenEmpty, refreshKey]);

    const [prevReset, setPrevReset] = useState({ enabled, baseId, resetWhenEmpty });
    if (
        prevReset.enabled !== enabled ||
        prevReset.baseId !== baseId ||
        prevReset.resetWhenEmpty !== resetWhenEmpty
    ) {
        setPrevReset({ enabled, baseId, resetWhenEmpty });
        if (enabled && resetWhenEmpty && !baseId) {
            setRecomendaciones({ similar: [], upsell: [], equilibrio: [] });
            setError(null);
        }
    }

    useEffect(() => {
        if (enabled && baseId) {
            const run = async () => {
                await fetchRecomendaciones();
            };
            void run();
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
    productosCatalogo,
    onSelectAgregar,
    onSelectReemplazar,
}: RecomendacionesPanelProps) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<TipoRecomendacion>('similar');

    const baseItem: SidebarCartItem | undefined = useMemo(() => {
        if (!selectedItemId) return undefined;
        return cartItems.find((i) => i.id === selectedItemId);
    }, [cartItems, selectedItemId]);

    const idProducto = baseItem?.id_producto;
    const codigoProducto = baseItem?.codigo ?? '';
    const descripcionProducto = baseItem?.descripcion ?? '';
    const productoBase = useMemo(
        () =>
            idProducto != null && Number(idProducto) > 0
                ? { id: Number(idProducto), codigo: codigoProducto, descripcion: descripcionProducto }
                : null,
        [idProducto, codigoProducto, descripcionProducto],
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

    const catalogoById = useMemo(() => {
        const mapa = new Map<number, ProductoBase>();
        (productosCatalogo ?? []).forEach((p) => {
            const key = Number(p.id_producto ?? p.id);
            if (!Number.isNaN(key)) mapa.set(key, p);
        });
        return mapa;
    }, [productosCatalogo]);

    const handleSelectAgregar = (item: RecomendacionItem, tipo: TipoRecomendacion) => {
        onSelectAgregar(item, tipo);
    };

    const handleSelectReemplazar = (item: RecomendacionItem, tipo: TipoRecomendacion) => {
        if (baseCartId && onSelectReemplazar) {
            onSelectReemplazar(baseCartId, item, tipo);
        }
    };

    const tipos: TipoRecomendacion[] = ['similar', 'equilibrio', 'upsell'];
    const currentList = recomendaciones[activeTab] || [];
    const activeConfig = TIPO_CONFIG[activeTab];

    return (
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 font-['DM_Sans']">
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
                            <span className="text-xs font-mono text-zinc-500">
                                BASE: {formatCode(productoBase.codigo)}
                            </span>
                        )}
                    </div>
                </div>

                {/* BOTÓN MINIMIZAR / MAXIMIZAR (Igual al panel RESUMEN) */}
                <button
                    type="button"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="min-h-11 min-w-11 -mr-2 inline-flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors text-amber-700"
                    title={isMinimized ? 'Expandir' : 'Minimizar'}
                    aria-label={isMinimized ? 'Expandir recomendaciones' : 'Minimizar recomendaciones'}
                    aria-expanded={!isMinimized}
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
                                    aria-pressed={isActive}
                                    className={`flex-1 min-h-11 px-2 rounded-lg text-xs font-extrabold font-['DM_Sans'] tracking-wider transition-all flex items-center justify-center gap-1 ${isActive ? cfg.activeTabBg : cfg.inactiveTabBg
                                        }`}
                                >
                                    <span>{cfg.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={`px-1 py-0.2 text-xs rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-zinc-700'
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
                            <div className="text-center py-10 text-zinc-500 space-y-2">
                                <Sparkles className="size-7 mx-auto text-amber-500 opacity-80" />
                                <p className="text-xs font-medium">Agrega un producto al carrito para ver sugerencias de IA</p>
                            </div>
                        ) : !baseItem ? (
                            <div className="text-center py-10 text-zinc-500 space-y-2">
                                <Sparkles className="size-7 mx-auto text-amber-500 opacity-80" />
                                <p className="text-xs font-medium">
                                    Haz clic en el icono de recomendaciones IA de un producto para ver sugerencias
                                </p>
                            </div>
                        ) : !productoBase ? (
                            <div className="text-center py-8 text-zinc-500">
                                <p className="text-xs font-medium">El producto seleccionado no tiene ID válido para recomendar</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-6 text-red-600">
                                <p className="text-xs">{error}</p>
                                <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
                                    <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                                </Button>
                            </div>
                        ) : loading ? (
                            <div className="py-12 text-center text-zinc-500 text-xs animate-pulse">
                                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-amber-600" />
                                Analizando con IA y consultando precios/stock...
                            </div>
                        ) : currentList.length === 0 ? (
                            <div className="text-center py-8 text-zinc-500">
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
                                            catalogoItem={catalogoById.get(Number(item.id_producto))}
                                            onAgregar={() => handleSelectAgregar(item, activeTab)}
                                            onReemplazar={() => handleSelectReemplazar(item, activeTab)}
                                            showReemplazar={!!baseCartId && !!onSelectReemplazar}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-zinc-500 text-right pt-1 border-t border-gray-100">
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
    catalogoItem?: ProductoBase;
    onAgregar: () => void;
    onReemplazar: () => void;
    showReemplazar: boolean;
}

export function RecomendacionCardSection({
    item,
    catalogoItem,
    onAgregar,
    onReemplazar,
    showReemplazar,
}: RecomendacionCardSectionProps) {
    const rawImagen =
        item.imagen_url || catalogoItem?.foto_url || catalogoItem?.imagenUrl || null;
    const imagenSrc = rawImagen ? getImageUrl(rawImagen) : null;
    const ubicacion = item.ubicacion || item.almacen || catalogoItem?.estante || '';
    const empaque = item.unidades_por_caja ?? catalogoItem?.unidades_por_caja ?? catalogoItem?.presentacion ?? null;

    return (
        <div className="bg-white rounded-lg border border-gray-200/80 p-2.5 shadow-sm space-y-2.5">
            {/* DETALLES DE PRODUCTO */}
            <div className="flex gap-2.5 items-start">
                {/* IMAGEN (64×64 con placeholder elegante por categoría) */}
                <div className="w-16 h-16 rounded-lg border border-zinc-200/80 flex-shrink-0 overflow-hidden bg-zinc-50 flex items-center justify-center">
                    {imagenSrc ? (
                        <Image
                            src={imagenSrc}
                            alt={item.descripcion}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.visibility = 'hidden';
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-brand-soft/60 text-brand-ink">
                            <Package className="size-5" aria-hidden="true" />
                            <span className="text-xs font-bold uppercase tracking-wider text-brand-options text-center leading-none px-1 line-clamp-1" title={item.categoria || 'Producto'}>
                                {item.categoria || 'Producto'}
                            </span>
                        </div>
                    )}
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="inline-block px-1.5 py-0.5 bg-zinc-50 rounded text-zinc-600 font-medium text-xs font-['DM_Sans'] border border-zinc-200/80">
                        {formatCode(item.codigo)}
                    </div>

                    <p className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-tight font-['DM_Sans']" title={item.descripcion}>
                        {item.descripcion}
                    </p>

                    <div className="flex flex-wrap items-center gap-1 text-xs pt-0.5 font-['DM_Sans']">
                        {ubicacion && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 border border-neutral-200/80 rounded font-semibold flex items-center gap-1">
                                <Archive className="w-3 h-3 text-neutral-500" aria-hidden="true" />
                                {ubicacion}
                            </span>
                        )}

                        {empaque && (
                            <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200/80 rounded font-semibold flex items-center gap-1">
                                <Package className="w-3 h-3 text-zinc-500" aria-hidden="true" />
                                {empaque}
                            </span>
                        )}

                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                            {item.stock}
                        </span>
                    </div>
                </div>
            </div>

            {/* ACCIONES */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onAgregar}
                    className="min-h-9 px-3 py-2 text-xs font-semibold font-['DM_Sans'] text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    AGREGAR
                </button>

                {showReemplazar && (
                    <button
                        type="button"
                        onClick={onReemplazar}
                        className="min-h-9 px-3 py-2 text-xs font-semibold font-['DM_Sans'] text-amber-700 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300/70 rounded-lg transition-colors uppercase tracking-wider inline-flex items-center gap-1.5"
                    >
                        REEMPLAZAR
                    </button>
                )}
            </div>
        </div>
    );
}

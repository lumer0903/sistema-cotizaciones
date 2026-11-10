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
    /** Tipo de venta del ítem base (UNIDAD | DOCENA | MAYOR) para el esquema de precio */
    tipo_venta?: string;
}

export interface SidebarCartItem {
    id: string;
    id_producto?: number;
    codigo: string;
    descripcion: string;
    tipo_venta?: string;
}

interface RecomendacionesPanelProps {
    /** Items del carrito */
    cartItems: SidebarCartItem[];
    /** ID del item seleccionado vía el botón de ACCIONES. Sin selección no se consulta la IA */
    selectedItemId?: string | null;
    tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA';
    idCliente?: number;
    idAlmacen?: number;
    /** Cotización (borrador) autosaveada: se registra en ia_interacciones.id_cotizacion */
    idCotizacion?: number | null;
    /** ID del item existente para habilitar "Reemplazar" (normalmente = producto base del carrito) */
    itemExistenteId?: string | null;
    /** Incrementar para forzar recarga */
    refreshKey?: number;
    /** Catálogo ya cargado del formulario: permite resolver la imagen de cada recomendación en cliente */
    productosCatalogo?: ProductoBase[];
    /** El usuario pulsó AGREGAR: el contenedor decide (p.ej. abrir el modal de confirmación) */
    onSelectAgregar: (item: RecomendacionItem, tipo: TipoRecomendacion, meta?: { idInteraccion?: number | null }) => void;
    /** El usuario pulsó REEMPLAZAR sobre el item base seleccionado */
    onSelectReemplazar?: (itemExistenteId: string, nuevoItem: RecomendacionItem, tipo: TipoRecomendacion, meta?: { idInteraccion?: number | null }) => void;
}

export const TIPO_CONFIG = {
    similar: {
        label: 'SIMILAR',
        icon: Zap,
        desc: 'Productos parecidos al seleccionado',
    },
    equilibrio: {
        label: 'EQUILIBRIO',
        icon: Scale,
        desc: 'Mejor relación precio-calidad',
    },
    upsell: {
        label: 'MEJOR OPCIÓN',
        icon: TrendingUp,
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
        id_interaccion: src?.id_interaccion ?? null,
    };
}

export interface UseRecomendacionesOptions {
    idCliente?: number;
    idAlmacen?: number;
    tipoPrecioCliente?: 'DISTRIBUIDOR' | 'TIENDA';
    /** Cotización (borrador) autosaveada → ia_interacciones.id_cotizacion */
    idCotizacion?: number | null;
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
        idCotizacion,
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
                tipo_venta: productoBase?.tipo_venta,
                ...(idCotizacion != null ? { id_cotizacion: idCotizacion } : {}),
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
    }, [baseId, idCliente, idAlmacen, tipoPrecioCliente, idCotizacion, productoBase?.tipo_venta, silent, resetWhenEmpty, refreshKey]);

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
    idCotizacion,
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
    const tipoVentaProducto = baseItem?.tipo_venta;
    const productoBase = useMemo(
        () =>
            idProducto != null && Number(idProducto) > 0
                ? {
                    id: Number(idProducto),
                    codigo: codigoProducto,
                    descripcion: descripcionProducto,
                    tipo_venta: tipoVentaProducto,
                }
                : null,
        [idProducto, codigoProducto, descripcionProducto, tipoVentaProducto],
    );

    const { recomendaciones, loading, error, refetch } = useRecomendaciones(productoBase, {
        idCliente,
        idAlmacen,
        tipoPrecioCliente,
        idCotizacion,
        enabled: !!productoBase,
        silent: true,
        refreshKey,
    });

    const idInteraccion = recomendaciones.id_interaccion ?? null;

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
        onSelectAgregar(item, tipo, { idInteraccion });
    };

    const handleSelectReemplazar = (item: RecomendacionItem, tipo: TipoRecomendacion) => {
        if (baseCartId && onSelectReemplazar) {
            onSelectReemplazar(baseCartId, item, tipo, { idInteraccion });
        }
    };

    const tipos: TipoRecomendacion[] = ['similar', 'equilibrio', 'upsell'];
    const currentList = recomendaciones[activeTab] || [];
    const activeConfig = TIPO_CONFIG[activeTab];

    return (
        <div className="w-full max-w-sm bg-surface rounded-xl shadow-md border border-border-default overflow-hidden transition-[box-shadow,transform,background-color,color] duration-300 font-sans">
            {/* CABECERA PRINCIPAL */}
            <div className={`p-4 flex items-center justify-between ${!isMinimized ? 'border-b border-border-default' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-accent-primary/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-accent-ink" />
                    </div>
                    <div>
                        <h3 className="text-base font-extrabold text-zinc-700 tracking-wide font-sans">
                            RECOMENDACIONES
                        </h3>
                        {productoBase && !isMinimized && (
                            <span className="text-xs font-mono text-brand-options">
                                BASE: {formatCode(productoBase.codigo)}
                            </span>
                        )}
                    </div>
                </div>

                {/* BOTÓN MINIMIZAR / MAXIMIZAR (Igual al panel RESUMEN) */}
                <Button
                    variant="ghost"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="min-h-11 min-w-11 -mr-2 p-0 text-accent-ink hover:bg-zinc-100"
                    title={isMinimized ? 'Expandir' : 'Minimizar'}
                    aria-label={isMinimized ? 'Expandir recomendaciones' : 'Minimizar recomendaciones'}
                    aria-expanded={!isMinimized}
                >
                    {isMinimized ? (
                        <Plus className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                        <Minus className="w-5 h-5 stroke-[2.5]" />
                    )}
                </Button>
            </div>

            {/* CONTENIDO PRINCIPAL */}
            {!isMinimized && (
                <>
                    {/* NAVEGACIÓN POR TABS */}
                    <div className="p-2 bg-zinc-50/50 border-b border-border-default flex items-center justify-between gap-1">
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
                                className={`flex-1 min-h-11 px-2 rounded-lg text-xs font-extrabold font-sans tracking-wider transition-[background-color,color,transform] flex items-center justify-center gap-1 active:scale-[0.96] ${isActive ? 'bg-brand-primary text-on-brand shadow-sm' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                                    }`}
                            >
                                <span>{cfg.label}</span>
                                {count > 0 && (
                                    <span
                                        className={`px-1 py-0.2 text-xs rounded-full ${isActive ? 'bg-on-brand/10 text-on-brand' : 'bg-zinc-200 text-zinc-700'
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
                            <div className="py-10 text-left space-y-2">
                                <Sparkles className="size-7 mx-auto text-accent-ink opacity-80" />
                                <p className="text-sm font-medium">Agrega un producto al carrito para ver sugerencias de IA</p>
                            </div>
                        ) : !baseItem ? (
                            <div className="py-10 text-left">
                                <Sparkles className="size-7 mx-auto text-accent-ink opacity-80" />
                                <p className="text-sm font-medium">Haz clic en el icono de recomendaciones IA de un producto para ver sugerencias</p>
                            </div>
                        ) : !productoBase ? (
                            <div className="py-8 text-left">
                                <p className="text-sm font-medium">El producto seleccionado no tiene ID válido para recomendar</p>
                            </div>
                        ) : error ? (
                            <div className="py-6 text-left text-danger">
                                <p className="text-sm">{error}</p>
                                <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
                                    <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                                </Button>
                            </div>
                        ) : loading ? (
                            <div className="py-12 text-left text-sm animate-pulse">
                                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-accent-ink" />
                                Analizando con IA y consultando precios/stock...
                            </div>
                        ) : currentList.length === 0 ? (
                            <div className="py-8 text-left">
                                <p className="text-sm">
                                    <>No hay productos en la categoría <strong>{activeConfig.label}</strong></>
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-xl border border-border-default bg-surface-muted space-y-3">

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

                        <p className="text-sm text-brand-options text-left pt-1 border-t border-border-default">
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
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const ubicacion = item.ubicacion || item.almacen || catalogoItem?.estante || '';
    const empaque = item.unidades_por_caja ?? catalogoItem?.unidades_por_caja ?? catalogoItem?.presentacion ?? null;

    return (
        <div className="bg-surface rounded-lg border border-border-default p-2.5 shadow-sm space-y-2.5 hover:bg-zinc-50/80 transition-colors">
            {/* DETALLES DE PRODUCTO */}
            <div className="flex gap-2.5 items-start">
                {/* IMAGEN (64×64 con placeholder elegante por categoría) */}
                <div className="w-16 h-16 rounded-lg border border-border-default flex-shrink-0 overflow-hidden bg-zinc-50 flex items-center justify-center">
                    {imagenSrc && failedImage !== imagenSrc ? (
                        <Image
                            unoptimized
                            src={imagenSrc}
                            alt={item.descripcion}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            onError={() => setFailedImage(imagenSrc)}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-accent-soft/60 text-accent-ink">
                            <Package className="size-5" aria-hidden="true" />
                            <span className="text-xs font-bold text-brand-options text-center leading-none px-1 line-clamp-1" title={item.categoria || 'Producto'}>
                                {item.categoria || 'Producto'}
                            </span>
                        </div>
                    )}
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-zinc-600 font-medium text-sm font-sans">
                        <span className="size-2 rounded-full bg-zinc-400" aria-hidden="true" />
                        {formatCode(item.codigo)}
                    </div>

                    <p className="text-sm font-semibold text-brand-subtitle line-clamp-2 leading-tight font-sans" title={item.descripcion}>
                        {item.descripcion}
                    </p>

                    <div className="flex flex-wrap items-center gap-1 text-sm pt-0.5 font-sans">
                        {ubicacion && (
                            <span className="text-zinc-700 font-semibold flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-zinc-400" aria-hidden="true" />
                                {ubicacion}
                            </span>
                        )}

                        {empaque && (
                            <span className="text-zinc-700 font-semibold flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-zinc-400" aria-hidden="true" />
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
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border-default">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onAgregar}
                    className="text-xs font-bold"
                >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
Agrega
                </Button>

                {showReemplazar && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onReemplazar}
                        className="text-xs font-bold text-accent-ink bg-accent-primary/10 hover:bg-accent-primary/20 border-accent-primary/40"
                    >
Reemplaza
                    </Button>
                )}
            </div>
        </div>
    );
}

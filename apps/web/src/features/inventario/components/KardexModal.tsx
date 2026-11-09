'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Download, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
    Modal,
    Badge,
    Button,
    Select,
    Input,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui';
import { ProductoInventario, Almacen } from '@goldcontinent/shared/types/inventario';
import { inventarioApi, KardexResponse } from '../api/inventario.api';
import { apiErrorMessage } from '@/lib/apiClient';
import { useInventoryProducts } from '../useInventoryProducts';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
import { formatCode, formatText } from '@/lib/formatters';
import { ProductoSearchField } from './ProductoSearchField';

interface KardexModalProps {
    open: boolean;
    onClose: () => void;
    producto: ProductoInventario | null;
    almacenes?: Almacen[];
}

export function KardexModal({ open, onClose, producto, almacenes: almacenesProp = [] }: KardexModalProps) {
    const [movimientos, setMovimientos] = useState<KardexResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);

    const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');
    const [filtroAlmacen, setFiltroAlmacen] = useState<string>('');
    const [exportando, setExportando] = useState(false);

    const [selectedProducto, setSelectedProducto] = useState<ProductoInventario | null>(producto);
    const requestRef = useRef<AbortController | null>(null);
    const [requestError, setRequestError] = useState<string | null>(null);

    // Buscador con autocompletado (el listbox vive en ProductoSearchField)
    const [searchQuery, setSearchQuery] = useState('');
    const remote=useInventoryProducts(open,searchQuery);
    const productos=remote.productos;

    const [prevReset, setPrevReset] = useState({ open, producto });
    if (prevReset.open !== open || prevReset.producto !== producto) {
        setPrevReset({ open, producto });
        setSelectedProducto(producto);
        setFiltroTipo('TODOS');
        setFechaInicio('');
        setFechaFin('');
        setFiltroAlmacen('');
        setPage(1);
        setMovimientos([]);
        setTotal(0);
        if (producto) {
            setSearchQuery(formatCode(producto.codigo));
        } else {
            setSearchQuery('');
        }
    }

    const handleSelectProducto = (prod: ProductoInventario) => {
        setSelectedProducto(prod);
        setSearchQuery(formatCode(prod.codigo));
        setMovimientos([]);
        setTotal(0);
        setPage(1);
    };

    /** Píldora de stock mostrada en cada sugerencia. */
    const stockPill = (p: ProductoInventario) =>
        `Stock: ${p.stock_total ?? p.stock_actual?.[0]?.cantidad ?? 0} u.`;

    const fetchKardex = useCallback(async (pageNum: number = 1) => {
        if (!selectedProducto) return;
        requestRef.current?.abort();
        const controller=new AbortController();
        requestRef.current=controller;
        setLoading(true);setRequestError(null);setMovimientos([]);
        try {
            const res = await inventarioApi.obtenerKardex(selectedProducto.id_producto, {
                id_almacen: filtroAlmacen ? Number(filtroAlmacen) : undefined,
                tipo: filtroTipo !== 'TODOS' ? filtroTipo as 'entrada' | 'salida' | 'ajuste' | 'transferencia' : undefined,
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFin || undefined,
                page: pageNum,
                limit,
            },controller.signal);
            if(controller.signal.aborted) return;
            setMovimientos(res.data);
            setTotal(res.total);
            setPage(res.page);
        } catch (error) {
            console.error('Error fetching kardex:', error);
            if(!controller.signal.aborted){setRequestError(apiErrorMessage(error));setMovimientos([]);setTotal(0);}
        } finally {
            if(!controller.signal.aborted)setLoading(false);
        }
    }, [selectedProducto, filtroAlmacen, filtroTipo, fechaInicio, fechaFin, limit]);

    /** Restablece los filtros manteniendo el producto seleccionado. */
    const limpiarFiltros = () => {
        setFiltroTipo('TODOS');
        setFechaInicio('');
        setFechaFin('');
        setFiltroAlmacen('');
        setPage(1);
    };

    const handleExportCSV = async () => {
        if (!selectedProducto) return;
        setExportando(true);
        try {
            const params=new URLSearchParams();
            if(filtroAlmacen)params.set('id_almacen',filtroAlmacen);
            if(filtroTipo!=='TODOS')params.set('tipo',filtroTipo);
            if(fechaInicio)params.set('fecha_inicio',fechaInicio);
            if(fechaFin)params.set('fecha_fin',fechaFin);
            if(fechaInicio && fechaFin && fechaInicio>fechaFin) throw new Error('Rango invertido');
            const a=document.createElement('a');
            a.href='/api/inventario/kardex/'+selectedProducto.id_producto+'/export?'+params;
            a.download='kardex-'+formatCode(selectedProducto.codigo)+'.csv';
            document.body.appendChild(a);a.click();a.remove();
            showToast.success('Descarga solicitada');
        } catch (error) {
            console.error('Error exporting kardex:', error);
            showToast.error('Error al exportar el kárdex');
        } finally {
            setExportando(false);
        }
    };

    useEffect(() => {
        if (open && selectedProducto) {
            const run = async () => {
                await fetchKardex(page);
            };
            void run();
        }
        return ()=>requestRef.current?.abort();
    }, [open, selectedProducto, fetchKardex, page]);

    const renderBadgeTipo = (tipo: string) => {
        switch (tipo) {
            case 'entrada':
                return (
                    <Badge variant="success">
                        <ArrowDownLeft className="w-3 h-3 mr-1 inline" /> ENTRADA
                    </Badge>
                );
            case 'salida':
                return (
                    <Badge variant="danger">
                        <ArrowUpRight className="w-3 h-3 mr-1 inline" /> SALIDA
                    </Badge>
                );
            case 'ajuste':
                return <Badge variant="warning">AJUSTE</Badge>;
            case 'transferencia':
                return <Badge variant="brand">TRANSFERENCIA</Badge>;
            default:
                return <Badge variant="neutral">{tipo.toUpperCase()}</Badge>;
        }
    };

    const renderOrigen = (origen: string, tipo: string, referencia: string | null) => {
        const origenLabels: Record<string, string> = {
            compra: 'Compra',
            venta: 'Venta',
            devolucion_cliente: 'Dev. Cliente',
            ajuste_fisico: 'Ajuste Físico',
            merma: 'Merma',
            transferencia: 'Transferencia',
            cotizacion_aprobada: 'Cot. Aprobada',
        };
        const label = origenLabels[origen] || origen;
        if (referencia && tipo === 'transferencia') {
            return `${label} (Ref: ${referencia})`;
        }
        return label;
    };

    const totalPages = Math.ceil(total / limit) || 1;

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Kárdex de producto"
            maxWidth="xl"
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={!selectedProducto || exportando || loading || movimientos.length === 0}
                        loading={exportando}
                    >
                        <Download className="w-4 h-4" aria-hidden="true" />
                        Exportar CSV
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cerrar
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                {/* Producto analizado */}
                <ProductoSearchField
                    productos={productos}
                    loading={remote.loading}
                    loadError={remote.error}
                    value={searchQuery}
                    onValueChange={(value) => {
                        setSearchQuery(value.toUpperCase());
                        if (selectedProducto) setSelectedProducto(null);
                    }}
                    onSelect={handleSelectProducto}
                    label="Buscar producto"
                    placeholder="Escriba el código del producto..."
                    stockPill={stockPill}
                />

                {/* Filtros de movimientos */}
                <div className="space-y-3.5">
                    <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border-default bg-zinc-50/80 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Select
                            label="Tipo de movimiento"
                            value={filtroTipo}
                            onChange={(e) => { setFiltroTipo(String(e.target.value)); setPage(1); }}
                            disabled={!selectedProducto}
                            options={[
                                { label: 'Todos', value: 'TODOS' },
                                { label: 'Entradas', value: 'entrada' },
                                { label: 'Salidas', value: 'salida' },
                                { label: 'Ajustes', value: 'ajuste' },
                                { label: 'Transferencias', value: 'transferencia' },
                            ]}
                        />
                        <Input
                            label="Inicio"
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
                            disabled={!selectedProducto}
                            icon={<Calendar className="w-4 h-4 text-brand-options" />}
                        />
                        <Input
                            label="Hasta"
                            type="date"
                            value={fechaFin}
                            onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
                            disabled={!selectedProducto}
                            icon={<Calendar className="w-4 h-4 text-brand-options" />}
                        />
                        <Select
                            label="Ubicación"
                            value={filtroAlmacen}
                            onChange={(e) => { setFiltroAlmacen(String(e.target.value)); setPage(1); }}
                            disabled={!selectedProducto}
                            options={[
                                { label: 'Todos los almacenes', value: '' },
                                ...(selectedProducto?.stock_actual?.length
                                    ? selectedProducto.stock_actual.map((s) => ({
                                        label: `${s.almacen?.codigo} - ${formatText(s.almacen?.nombre || '')}`,
                                        value: String(s.id_almacen),
                                    }))
                                    : almacenesProp.map((a) => ({
                                        label: `${a.codigo || a.id_almacen} - ${formatText(a.nombre)}`,
                                        value: String(a.id_almacen),
                                    }))),
                            ]}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={limpiarFiltros}
                            disabled={!selectedProducto}
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                </div>

                {/* ENCABEZADO RESUMEN DEL PRODUCTO */}
                {selectedProducto && (
                    <div className="bg-accent-selection/40 border border-accent-primary/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 shrink-0 bg-surface-muted rounded-lg border border-stone-200 flex items-center justify-center overflow-hidden">
                                {selectedProducto.foto_url ? (
                                    <Image
                                        unoptimized
                                        src={getImageUrl(selectedProducto.foto_url, '115')}
                                        alt={selectedProducto.descripcion}
                                        width={115}
                                        height={128}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleImageError(e, '115')}
                                    />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-stone-300" />
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-accent-ink text-xl">
                                    {formatText(selectedProducto.codigo)}
                                </h4>
                                <h4 className="font-medium text-brand-text text-zinc-700 text-sm">
                                    {formatText(selectedProducto.descripcion)}
                                </h4>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-accent-primary/40 pt-2 md:pt-0 md:pl-4">
                            <div className="text-center">
                                <span className="block text-sm font-bold text-zinc-700 uppercase">Stock Actual</span>
                                <span className="text-lg font-bold tabular-nums text-estado-aprobado-text">
                                    {selectedProducto.stock_total ?? selectedProducto.stock_actual?.[0]?.cantidad ?? 0} u.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLA DE MOVIMIENTOS */}
                {!selectedProducto ? (
                    <div className="p-12 text-center bg-zinc-50/50 rounded-xl border border-dashed border-border-default">
                        <p className="text-sm font-medium text-stone-500">
                            Selecciona un producto para cargar el historial de movimientos.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="p-6 sm:p-8 text-center text-brand-options text-sm animate-pulse">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-accent-ink" />
                        Cargando historial de movimientos del Kárdex...
                    </div>
                ) : requestError ? (
                    <div role="alert" className="p-4 text-danger">{requestError}<Button onClick={()=>fetchKardex(page)}>Reintentar</Button></div>
                ) : movimientos.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-300">
                        <p className="text-sm font-semibold text-brand-options">
                            No se registraron movimientos con los filtros seleccionados.
                        </p>
                    </div>
                ) : (
                    <>
                        <Table className="min-w-[48rem]" scrollLabel="Movimientos de kárdex">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">FECHA</TableHead>
                                    <TableHead className="whitespace-nowrap">TIPO</TableHead>
                                    <TableHead className="whitespace-nowrap">ALMACÉN</TableHead>
                                    <TableHead className="whitespace-nowrap">MOTIVO</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">CANTIDAD</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">STOCK</TableHead>
                                    <TableHead className="whitespace-nowrap">USUARIO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movimientos.map((mov) => (
                                    <TableRow key={mov.id_movimiento}>
                                        <TableCell className="font-mono text-sm">{new Date(mov.fecha).toLocaleString('es-PE')}</TableCell>
                                        <TableCell>{renderBadgeTipo(mov.tipo)}</TableCell>
                                        <TableCell className="text-sm text-brand-options">{mov.almacen || '—'}</TableCell>
                                        <TableCell className="font-medium text-sm">{renderOrigen(mov.origen, mov.tipo, mov.referencia)}</TableCell>
                                        <TableCell className={`text-right font-bold ${mov.tipo === 'entrada' ? 'text-estado-aprobado-text' :
                                                mov.tipo === 'salida' ? 'text-danger' :
                                                    mov.tipo === 'ajuste' ? 'text-accent-ink' :
                                                        'text-estado-enviado'
                                            }`}>
                                            {mov.tipo === 'entrada' ? `+${mov.cantidad}` : mov.tipo === 'salida' ? `-${mov.cantidad}` : mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-brand-subtitle">
                                            {mov.stock_posterior} u.
                                        </TableCell>
                                        <TableCell className="text-sm text-brand-options">{mov.usuario || 'Sistema'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-3 border-t border-border-default">
                                <div className="text-sm text-brand-options">
                                    Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total} movimientos
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(page - 1)}
                                        disabled={page <= 1 || loading}
                                        aria-label="Página anterior"
                                        className="min-h-11 min-w-11"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum: number;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (page <= 3) {
                                            pageNum = i + 1;
                                        } else if (page >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = page - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={page === pageNum ? 'primary' : 'outline'}
                                                size="sm"
                                                onClick={() => setPage(pageNum)}
                                                aria-label={`Página ${pageNum}`}
                                                aria-current={page === pageNum ? 'page' : undefined}
                                                className="min-h-11 min-w-11 px-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(page + 1)}
                                        disabled={page >= totalPages || loading}
                                        aria-label="Página siguiente"
                                        className="min-h-11 min-w-11"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Modal>
    );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Download, ChevronLeft, ChevronRight, Image as ImageIcon, Search } from 'lucide-react';
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
import { apiClient } from '@/lib/apiClient';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
import { formatCode, formatText } from '@/lib/formatters';

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
    const [productos, setProductos] = useState<ProductoInventario[]>([]);
    const [loadingProductos, setLoadingProductos] = useState(false);

    // Estado para el buscador con autocompletado (3 opciones)
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
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

        if (open && !producto && productos.length === 0) {
            const fetchProds = async () => {
                setLoadingProductos(true);
                try {
                    const res = await apiClient('/productos?limit=500&include=categoria,stock');
                    setProductos(res.data || res.items || []);
                } catch (e) {
                    console.error('Error fetching productos:', e);
                } finally {
                    setLoadingProductos(false);
                }
            };
            fetchProds();
        }
    }, [open, producto]);

    // Filtrar máximo 3 sugerencias coincidente al escribir
    const sugerencias = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.toLowerCase();
        return productos
            .filter((p) =>
                p.codigo.toLowerCase().includes(query) ||
                (p.descripcion && p.descripcion.toLowerCase().includes(query))
            )
            .slice(0, 3);
    }, [productos, searchQuery]);

    const handleSelectProducto = (prod: ProductoInventario) => {
        setSelectedProducto(prod);
        setSearchQuery(formatCode(prod.codigo));
        setShowSuggestions(false);
        setMovimientos([]);
        setTotal(0);
        setPage(1);
    };

    const fetchKardex = useCallback(async (pageNum: number = 1) => {
        if (!selectedProducto) return;
        setLoading(true);
        try {
            const res = await inventarioApi.obtenerKardex(selectedProducto.id_producto, {
                id_almacen: filtroAlmacen ? Number(filtroAlmacen) : undefined,
                tipo: filtroTipo !== 'TODOS' ? filtroTipo as 'entrada' | 'salida' | 'ajuste' | 'transferencia' : undefined,
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFin || undefined,
                page: pageNum,
                limit,
            });
            setMovimientos(res.data);
            setTotal(res.total);
            setPage(res.page);
        } catch (error) {
            console.error('Error fetching kardex:', error);
            showToast.error('Error al cargar el kárdex');
        } finally {
            setLoading(false);
        }
    }, [selectedProducto, filtroAlmacen, filtroTipo, fechaInicio, fechaFin, limit]);

    const handleExportCSV = async () => {
        if (!selectedProducto) return;
        setExportando(true);
        try {
            const blob = await inventarioApi.exportarKardexCSV(selectedProducto.id_producto, {
                id_almacen: filtroAlmacen ? Number(filtroAlmacen) : undefined,
                tipo: filtroTipo !== 'TODOS' ? filtroTipo as 'entrada' | 'salida' | 'ajuste' | 'transferencia' : undefined,
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFin || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `kardex-${formatCode(selectedProducto.codigo)}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast.success('Kárdex exportado correctamente');
        } catch (error) {
            console.error('Error exporting kardex:', error);
            showToast.error('Error al exportar el kárdex');
        } finally {
            setExportando(false);
        }
    };

    useEffect(() => {
        if (open && selectedProducto) {
            fetchKardex(page);
        }
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
            title={selectedProducto ? `Kárdex de Producto: ${formatCode(selectedProducto.codigo)}` : 'Kárdex Global'}
            maxWidth="xl"
        >
            <div className="space-y-5">
                {/* BUSCADOR CON AUTOCOMPLETADO (MAX 3 OPCIONES) */}
                <div className="relative mb-4">
                    <Input
                        label="SELECCIONAR O BUSCAR PRODUCTO POR CÓDIGO"
                        placeholder="Escriba el código del producto..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value.toUpperCase());
                            setShowSuggestions(true);
                            if (selectedProducto) setSelectedProducto(null);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        icon={<Search className="w-4 h-4 text-brand-options" />}
                        variant="modal"
                    />

                    {/* Desplegable de 3 sugerencias */}
                    {showSuggestions && searchQuery.trim().length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                            {sugerencias.length > 0 ? (
                                sugerencias.map((p) => (
                                    <button
                                        key={p.id_producto}
                                        type="button"
                                        className="w-full text-left px-4 py-2.5 hover:bg-stone-50 transition-colors flex items-center justify-between border-b last:border-b-0 border-stone-100"
                                        onClick={() => handleSelectProducto(p)}
                                    >
                                        <div>
                                            <span className="font-bold text-xs text-stone-800 block">
                                                {formatCode(p.codigo)}
                                            </span>
                                            <span className="text-xs text-stone-500 truncate max-w-sm block">
                                                {formatText(p.descripcion)}
                                            </span>
                                        </div>
                                        <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600">
                                            Stock: {p.stock_total ?? p.stock_actual?.[0]?.cantidad ?? 0} u.
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-3 text-xs text-stone-400 text-center">
                                    No se encontraron productos coincidentes
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* BARRA DE FILTROS DE MOVIMIENTOS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                    <Select
                        label="Tipo Movimiento"
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
                        variant="modal"
                    />
                    <Input
                        label="Inicio"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => { setFechaInicio(e.target.value); setPage(1); }}
                        disabled={!selectedProducto}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                        variant="modal"
                    />
                    <Input
                        label="Hasta"
                        type="date"
                        value={fechaFin}
                        onChange={(e) => { setFechaFin(e.target.value); setPage(1); }}
                        disabled={!selectedProducto}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                        variant="modal"
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
                        variant="modal"
                    />
                </div>

                {/* ENCABEZADO RESUMEN DEL PRODUCTO */}
                {selectedProducto && (
                    <div className="bg-brand-selection/40 border border-brand-primary/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 shrink-0 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center overflow-hidden">
                                {selectedProducto.foto_url ? (
                                    <img
                                        src={getImageUrl(selectedProducto.foto_url, '115')}
                                        alt={selectedProducto.descripcion}
                                        className="w-full h-full object-cover"
                                        onError={(e) => handleImageError(e, '115')}
                                    />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-stone-300" />
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-brand-primary text-xl text-outline">
                                    {formatText(selectedProducto.codigo)}
                                </h4>
                                <h4 className="font-medium text-brand-text text-gray-700 text-sm">
                                    {formatText(selectedProducto.descripcion)}
                                </h4>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-brand-primary/40 pt-2 md:pt-0 md:pl-4">
                            <div className="text-center">
                                <span className="block text-[10px] font-bold text-gray-700 uppercase">Stock Actual</span>
                                <span className="text-lg font-bold text-estado-aprobado-text text-outline">
                                    {selectedProducto.stock_total ?? selectedProducto.stock_actual?.[0]?.cantidad ?? 0} u.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* TABLA DE MOVIMIENTOS */}
                {!selectedProducto ? (
                    <div className="p-12 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-xs font-medium text-stone-400">
                            Selecciona un producto para cargar el historial de movimientos.
                        </p>
                    </div>
                ) : loading ? (
                    <div className="p-8 text-center text-brand-options text-sm animate-pulse">
                        <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-primary" />
                        Cargando historial de movimientos del Kárdex...
                    </div>
                ) : movimientos.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-xs font-semibold text-brand-options">
                            No se registraron movimientos con los filtros seleccionados.
                        </p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>FECHA</TableHead>
                                    <TableHead>TIPO</TableHead>
                                    <TableHead>ALMACÉN</TableHead>
                                    <TableHead>MOTIVO</TableHead>
                                    <TableHead className="text-right">CANTIDAD</TableHead>
                                    <TableHead className="text-right">STOCK</TableHead>
                                    <TableHead>USUARIO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movimientos.map((mov) => (
                                    <TableRow key={mov.id_movimiento}>
                                        <TableCell className="font-mono text-xs">{new Date(mov.fecha).toLocaleString('es-PE')}</TableCell>
                                        <TableCell>{renderBadgeTipo(mov.tipo)}</TableCell>
                                        <TableCell className="text-xs text-brand-options">{mov.almacen || '—'}</TableCell>
                                        <TableCell className="font-medium text-xs">{renderOrigen(mov.origen, mov.tipo, mov.referencia)}</TableCell>
                                        <TableCell className={`text-right font-bold ${mov.tipo === 'entrada' ? 'text-estado-aprobado-text' :
                                                mov.tipo === 'salida' ? 'text-danger' :
                                                    mov.tipo === 'ajuste' ? 'text-brand-primary' :
                                                        'text-estado-enviado'
                                            }`}>
                                            {mov.tipo === 'entrada' ? `+${mov.cantidad}` : mov.tipo === 'salida' ? `-${mov.cantidad}` : mov.cantidad}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-brand-subtitle">
                                            {mov.stock_posterior} u.
                                        </TableCell>
                                        <TableCell className="text-xs text-brand-options">{mov.usuario || 'Sistema'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-3 border-t border-gray-100">
                                <div className="text-xs text-brand-options">
                                    Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} de {total} movimientos
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(page - 1)}
                                        disabled={page <= 1 || loading}
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
                                                className="w-8 h-8 px-0"
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
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* PIE Y BOTONES */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Button
                        variant="yellowOutline"
                        onClick={handleExportCSV}
                        disabled={!selectedProducto || exportando || loading || movimientos.length === 0}
                        loading={exportando}
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar CSV
                    </Button>
                    <Button variant="ghost" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
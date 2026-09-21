'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Filter, Download, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import { ProductoInventario } from '@goldcontinent/shared/types/inventario';
import { inventarioApi, KardexResponse, PaginatedKardexResponse } from '../api/inventario.api';
import { apiClient } from '@/lib/apiClient';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';

interface KardexModalProps {
    open: boolean;
    onClose: () => void;
    producto: ProductoInventario | null;
}

export function KardexModal({ open, onClose, producto }: KardexModalProps) {
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

    useEffect(() => {
        setSelectedProducto(producto);
        if (open && !producto) {
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
            toast.error('Error al cargar el kárdex');
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
            a.download = `kardex-${selectedProducto.codigo}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Kárdex exportado correctamente');
        } catch (error) {
            console.error('Error exporting kardex:', error);
            toast.error('Error al exportar el kárdex');
        } finally {
            setExportando(false);
        }
    };

    useEffect(() => {
        if (open && selectedProducto) {
            fetchKardex(1);
        }
    }, [open, selectedProducto, fetchKardex]);

    useEffect(() => {
        if (selectedProducto) {
            fetchKardex(page);
        }
    }, [page, fetchKardex]);

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
            title={selectedProducto ? `Kárdex de Producto: ${selectedProducto.codigo}` : 'Kárdex Global'}
            maxWidth="xl"
        >
            <div className="space-y-5">
                {!producto && (
                    <div className="mb-4">
                        <Select
                            label="SELECCIONAR PRODUCTO *"
                            value={selectedProducto?.id_producto?.toString() || ''}
                            onChange={(e) => {
                                const prod = productos.find(p => p.id_producto.toString() === e.target.value);
                                setSelectedProducto(prod || null);
                                setMovimientos([]);
                                setTotal(0);
                            }}
                            disabled={loadingProductos}
                        >
                            <option value="">Seleccione un producto</option>
                            {productos.map((p) => (
                                <option key={p.id_producto} value={p.id_producto}>
                                    {p.codigo} - {p.descripcion} (Stock: {p.stock_total ?? p.stock_actual?.[0]?.cantidad ?? 0})
                                </option>
                            ))}
                        </Select>
                    </div>
                )}
                
                {selectedProducto && (
                    <>
                        {/* ENCABEZADO RESUMEN DEL PRODUCTO */}
                        <div className="bg-brand-selection/40 border border-brand-primary/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Miniatura del producto */}
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
                                <h4 className="font-bold text-brand-subtitle text-base">{selectedProducto.descripcion}</h4>
                                <p className="text-xs text-brand-options mt-0.5">
                                    Categoría: <span className="font-medium text-brand-subtitle">{selectedProducto.categoria?.nombre_categoria || 'Sin categoría'}</span> |
                                    Tipo: <span className="font-medium text-brand-subtitle">{selectedProducto.tipo_flor || 'N/A'}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-brand-primary/20 pt-2 md:pt-0 md:pl-4">
                                <div className="text-center">
                                    <span className="block text-[10px] font-bold text-brand-options uppercase">Stock Actual</span>
                                    <span className="text-lg font-black text-brand-subtitle">{selectedProducto.stock_total ?? selectedProducto.stock_actual?.[0]?.cantidad ?? 0} u.</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-[10px] font-bold text-brand-options uppercase">Stock Mínimo</span>
                                    <span className="text-sm font-bold text-brand-options">{selectedProducto.stock_minimo} u.</span>
                                </div>
                            </div>
                        </div>

                {/* BARRA DE FILTROS DE MOVIMIENTOS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                    <Select
                        label="Tipo Movimiento"
                        value={filtroTipo}
                        onChange={(e) => { setFiltroTipo(e.target.value); fetchKardex(1); }}
                        options={[
                            { label: 'Todos los tipos', value: 'TODOS' },
                            { label: 'Entradas', value: 'entrada' },
                            { label: 'Salidas', value: 'salida' },
                            { label: 'Ajustes', value: 'ajuste' },
                            { label: 'Transferencias', value: 'transferencia' },
                        ]}
                    />
                    <Input
                        label="Fecha Desde"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => { setFechaInicio(e.target.value); fetchKardex(1); }}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                    />
                    <Input
                        label="Fecha Hasta"
                        type="date"
                        value={fechaFin}
                        onChange={(e) => { setFechaFin(e.target.value); fetchKardex(1); }}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                    />
                    <Select
                        label="Almacén"
                        value={filtroAlmacen}
                        onChange={(e) => { setFiltroAlmacen(e.target.value); fetchKardex(1); }}
                        options={[
                            { label: 'Todos los almacenes', value: '' },
                            ...(selectedProducto?.stock_actual?.map((s) => ({
                                label: `${s.almacen?.codigo} - ${s.almacen?.nombre}`,
                                value: String(s.id_almacen),
                            })) || []),
                        ]}
                    />
                </div>

                {/* TABLA DE MOVIMIENTOS */}
                {loading ? (
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
                                    <TableHead>ORIGEN / REF.</TableHead>
                                    <TableHead className="text-right">CANTIDAD</TableHead>
                                    <TableHead className="text-right">STOCK RESULTANTE</TableHead>
                                    <TableHead>USUARIO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movimientos.map((mov) => (
                                    <TableRow key={mov.id_movimiento}>
                                        <TableCell className="font-mono text-xs">{new Date(mov.fecha).toLocaleString('es-PE')}</TableCell>
                                        <TableCell>{renderBadgeTipo(mov.tipo)}</TableCell>
                                        <TableCell className="text-xs text-brand-options">{mov.usuario || 'Sistema'}</TableCell>
                                        <TableCell className="font-medium text-xs">{renderOrigen(mov.origen, mov.tipo, mov.referencia)}</TableCell>
                                        <TableCell className={`text-right font-bold ${
                                            mov.tipo === 'entrada' ? 'text-emerald-600' :
                                            mov.tipo === 'salida' ? 'text-rose-600' :
                                            mov.tipo === 'ajuste' ? 'text-amber-600' :
                                            'text-blue-600'
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
                                        onClick={() => fetchKardex(page - 1)}
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
                                                onClick={() => fetchKardex(pageNum)}
                                                className="w-8 h-8 px-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchKardex(page + 1)}
                                        disabled={page >= totalPages || loading}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </>
        )}

        {/* PIE Y BOTONES */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={exportando || loading || movimientos.length === 0}
                        loading={exportando}
                    >
                        <Download className="w-4 h-4 mr-1" />
                        Exportar CSV
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
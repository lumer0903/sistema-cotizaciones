'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Calendar, Filter } from 'lucide-react';
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

export interface MovimientoKardex {
    id_movimiento: number;
    fecha: string;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
    cantidad: number;
    stock_resultante: number;
    concepto: string;
    usuario: string;
    almacen: string;
}

interface KardexModalProps {
    open: boolean;
    onClose: () => void;
    producto: ProductoInventario | null;
    movimientos?: MovimientoKardex[];
    loading?: boolean;
}

export function KardexModal({
    open,
    onClose,
    producto,
    movimientos = [],
    loading = false,
}: KardexModalProps) {
    const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
    const [fechaInicio, setFechaInicio] = useState<string>('');
    const [fechaFin, setFechaFin] = useState<string>('');

    if (!producto) return null;

    // Filtrado local
    const movimientosFiltrados = movimientos.filter((m) => {
        if (filtroTipo !== 'TODOS' && m.tipo !== filtroTipo) return false;
        if (fechaInicio && new Date(m.fecha) < new Date(fechaInicio)) return false;
        if (fechaFin && new Date(m.fecha) > new Date(fechaFin + 'T23:59:59')) return false;
        return true;
    });

    const renderBadgeTipo = (tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE') => {
        switch (tipo) {
            case 'ENTRADA':
                return (
                    <Badge variant="success">
                        <ArrowDownLeft className="w-3 h-3 mr-1 inline" /> ENTRADA
                    </Badge>
                );
            case 'SALIDA':
                return (
                    <Badge variant="danger">
                        <ArrowUpRight className="w-3 h-3 mr-1 inline" /> SALIDA
                    </Badge>
                );
            case 'AJUSTE':
                return <Badge variant="warning">AJUSTE</Badge>;
            default:
                return <Badge variant="neutral">{tipo}</Badge>;
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Kárdex de Producto: ${producto.codigo}`}
            maxWidth="xl"
        >
            <div className="space-y-5">
                {/* ENCABEZADO RESUMEN DEL PRODUCTO */}
                <div className="bg-brand-selection/40 border border-brand-primary/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h4 className="font-bold text-brand-subtitle text-base">{producto.descripcion}</h4>
                        <p className="text-xs text-brand-options mt-0.5">
                            Categoría: <span className="font-medium text-brand-subtitle">{producto.categoria?.nombre_categoria || 'Sin categoría'}</span> |
                            Tipo: <span className="font-medium text-brand-subtitle">{producto.tipo_flor || 'N/A'}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-brand-primary/20 pt-2 md:pt-0 md:pl-4">
                        <div className="text-center">
                            <span className="block text-[10px] font-bold text-brand-options uppercase">Stock Actual</span>
                            <span className="text-lg font-black text-brand-subtitle">{producto.stock_total} u.</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-[10px] font-bold text-brand-options uppercase">Stock Mínimo</span>
                            <span className="text-sm font-bold text-brand-options">{producto.stock_minimo} u.</span>
                        </div>
                    </div>
                </div>

                {/* BARRA DE FILTROS DE MOVIMIENTOS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end bg-gray-50/80 p-3 rounded-xl border border-gray-200/80">
                    <Select
                        label="Tipo Movimiento"
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        options={[
                            { label: 'Todos los tipos', value: 'TODOS' },
                            { label: 'Entradas', value: 'ENTRADA' },
                            { label: 'Salidas', value: 'SALIDA' },
                            { label: 'Ajustes', value: 'AJUSTE' },
                        ]}
                    />
                    <Input
                        label="Fecha Desde"
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                    />
                    <Input
                        label="Fecha Hasta"
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        icon={<Calendar className="w-4 h-4 text-brand-options" />}
                    />
                </div>

                {/* TABLA DE MOVIMIENTOS */}
                {loading ? (
                    <div className="p-8 text-center text-brand-options text-sm animate-pulse">
                        Cargando historial de movimientos del Kárdex...
                    </div>
                ) : movimientosFiltrados.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-xs font-semibold text-brand-options">
                            No se registraron movimientos en el rango de fechas seleccionado.
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>FECHA</TableHead>
                                <TableHead>TIPO</TableHead>
                                <TableHead>ALMACÉN</TableHead>
                                <TableHead>CONCEPTO / OBSERVACIÓN</TableHead>
                                <TableHead className="text-right">CANTIDAD</TableHead>
                                <TableHead className="text-right">STOCK RESULTANTE</TableHead>
                                <TableHead>USUARIO</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {movimientosFiltrados.map((mov) => (
                                <TableRow key={mov.id_movimiento}>
                                    <TableCell className="font-mono text-xs">{mov.fecha}</TableCell>
                                    <TableCell>{renderBadgeTipo(mov.tipo)}</TableCell>
                                    <TableCell className="text-xs text-brand-options">{mov.almacen}</TableCell>
                                    <TableCell className="font-medium">{mov.concepto}</TableCell>
                                    <TableCell className={`text-right font-bold ${mov.tipo === 'ENTRADA' ? 'text-emerald-600' : mov.tipo === 'SALIDA' ? 'text-rose-600' : 'text-amber-600'
                                        }`}>
                                        {mov.tipo === 'ENTRADA' ? `+${mov.cantidad}` : mov.tipo === 'SALIDA' ? `-${mov.cantidad}` : mov.cantidad}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-brand-subtitle">
                                        {mov.stock_resultante} u.
                                    </TableCell>
                                    <TableCell className="text-xs text-brand-options">{mov.usuario}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* PIE Y BOTÓN CERRAR */}
                <div className="flex justify-end pt-3 border-t border-gray-100">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
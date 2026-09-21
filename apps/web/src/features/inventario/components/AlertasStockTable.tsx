'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { inventarioApi, AlertaStockResponse } from '../api/inventario.api';
import { Modal, Button, Badge, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';

interface AlertasStockTableProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AlertasStockTable({ open, onClose, onSuccess }: AlertasStockTableProps) {
    const [alertas, setAlertas] = useState<AlertaStockResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [estadoFiltro, setEstadoFiltro] = useState<'activa' | 'resuelta' | 'todas'>('activa');
    const [reconociendoId, setReconociendoId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'inventario' | 'cobranzas' | 'ventas'>('inventario');

    const fetchAlertas = useCallback(async () => {
        setLoading(true);
        try {
            const estado = estadoFiltro === 'todas' ? undefined : estadoFiltro;
            const res = await inventarioApi.obtenerAlertasStock(estado);
            setAlertas(res.data || []);
        } catch (error) {
            console.error('Error fetching alertas:', error);
        } finally {
            setLoading(false);
        }
    }, [estadoFiltro]);

    useEffect(() => {
        if (open && activeTab === 'inventario') {
            fetchAlertas();
        }
    }, [open, activeTab, fetchAlertas]);

    const handleReconocer = async (idAlerta: number) => {
        if (!confirm('¿Marcar esta alerta como reconocida/resuelta?')) return;
        setReconociendoId(idAlerta);
        try {
            await inventarioApi.reconocerAlerta(idAlerta);
            await fetchAlertas();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error reconociendo alerta:', error);
            alert('Error al reconocer la alerta');
        } finally {
            setReconociendoId(null);
        }
    };

    const renderEstadoBadge = (estado: 'activa' | 'resuelta') => {
        if (estado === 'activa') {
            return (
                <Badge variant="danger" className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" />
                    Activa
                </Badge>
            );
        }
        return (
            <Badge variant="success" className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Resuelta
            </Badge>
        );
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={onClose} title="Centro de Notificaciones" maxWidth="xl">
            <div className="flex border-b border-gray-200 mb-4">
                <button
                    type="button"
                    className={`pb-2 px-4 text-sm font-semibold transition-colors ${activeTab === 'inventario' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('inventario')}
                >
                    Inventario
                </button>
                <button
                    type="button"
                    className={`pb-2 px-4 text-sm font-semibold transition-colors ${activeTab === 'cobranzas' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('cobranzas')}
                >
                    Cobranzas
                </button>
                <button
                    type="button"
                    className={`pb-2 px-4 text-sm font-semibold transition-colors ${activeTab === 'ventas' ? 'border-b-2 border-brand-primary text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('ventas')}
                >
                    Ventas
                </button>
            </div>
            
            {activeTab === 'inventario' && (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-options uppercase">Filtrar:</span>
                        <Select
                            value={estadoFiltro}
                            onChange={(e) => setEstadoFiltro(e.target.value as 'activa' | 'resuelta' | 'todas')}
                            options={[
                                { label: 'Activas', value: 'activa' },
                                { label: 'Resueltas', value: 'resuelta' },
                                { label: 'Todas', value: 'todas' },
                            ]}
                            className="w-40"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchAlertas}
                        disabled={loading}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-brand-options text-sm animate-pulse">
                        <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-brand-primary" />
                        Cargando alertas...
                    </div>
                ) : alertas.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                        <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-xs font-semibold text-brand-options">
                            {estadoFiltro === 'activa' ? 'No hay alertas activas' : 'No hay alertas en este filtro'}
                        </p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>PRODUCTO</TableHead>
                                <TableHead>ALMACÉN</TableHead>
                                <TableHead className="text-center">STOCK ACTUAL</TableHead>
                                <TableHead className="text-center">STOCK MÍNIMO</TableHead>
                                <TableHead className="text-center">ESTADO</TableHead>
                                <TableHead>DETECTADA</TableHead>
                                <TableHead className="text-right">ACCIÓN</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {alertas.map((alerta) => (
                                <TableRow key={alerta.id_alerta}>
                                    <TableCell className="font-medium">
                                        {alerta.producto?.codigo} - {alerta.producto?.descripcion}
                                    </TableCell>
                                    <TableCell className="text-xs text-brand-options">
                                        {alerta.almacen?.codigo} - {alerta.almacen?.nombre}
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-rose-600">
                                        {alerta.stock_actual} u.
                                    </TableCell>
                                    <TableCell className="text-center font-bold text-brand-options">
                                        {alerta.stock_minimo} u.
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {renderEstadoBadge(alerta.estado)}
                                    </TableCell>
                                    <TableCell className="text-xs text-brand-options">
                                        {new Date(alerta.created_at).toLocaleString('es-PE')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {alerta.estado === 'activa' && (
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleReconocer(alerta.id_alerta)}
                                                disabled={reconociendoId === alerta.id_alerta}
                                                className="gap-1.5"
                                            >
                                                {reconociendoId === alerta.id_alerta ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Reconocer
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        {alerta.estado === 'resuelta' && alerta.reconocida_at && (
                                            <span className="text-xs text-emerald-600 font-medium">
                                                {new Date(alerta.reconocida_at).toLocaleString('es-PE')}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
            )}
            
            {activeTab === 'cobranzas' && (
                <div className="p-8 text-center text-gray-400">
                    No hay alertas de cobranzas
                </div>
            )}
            
            {activeTab === 'ventas' && (
                <div className="p-8 text-center text-gray-400">
                    No hay alertas de ventas
                </div>
            )}
        </Modal>
    );
}
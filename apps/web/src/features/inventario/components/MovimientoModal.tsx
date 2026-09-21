'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, ArrowDownLeft, Minus, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi, MovimientoFormData } from '../api/inventario.api';
import { TipoMovimientoInventario, OrigenMovimiento } from '@goldcontinent/shared/constants/enums';

const MovimientoSchema = z.object({
    id_producto: z.number().min(1, 'Seleccione un producto'),
    id_almacen: z.number().min(1, 'Seleccione un almacén'),
    tipo: z.enum(['entrada', 'salida', 'ajuste']),
    origen: z.enum(['compra', 'venta', 'devolucion_cliente', 'ajuste_fisico', 'merma', 'transferencia', 'cotizacion_aprobada']),
    cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
    costo_unitario: z.number().min(0).optional().nullable(),
    observaciones: z.string().max(500).optional(),
});

type MovimientoFormInput = z.infer<typeof MovimientoSchema>;

interface ProductoSimple {
    id_producto: number;
    codigo: string;
    descripcion: string;
    stock_total: number;
}

interface AlmacenSimple {
    id_almacen: number;
    codigo: string;
    nombre: string;
}

interface MovimientoModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    productoPreseleccionado?: number | null;
}

const TIPO_OPTIONS = [
    { label: 'Entrada (+)', value: 'entrada' as const, icon: ArrowDownLeft, color: 'text-emerald-600' },
    { label: 'Salida (-)', value: 'salida' as const, icon: ArrowUpRight, color: 'text-rose-600' },
    { label: 'Ajuste', value: 'ajuste' as const, icon: Minus, color: 'text-amber-600' },
];

const ORIGEN_OPTIONS: { label: string; value: OrigenMovimiento; allowedTipos: ('entrada' | 'salida' | 'ajuste')[] }[] = [
    { label: 'Compra', value: 'compra', allowedTipos: ['entrada'] },
    { label: 'Venta', value: 'venta', allowedTipos: ['salida'] },
    { label: 'Devolución Cliente', value: 'devolucion_cliente', allowedTipos: ['entrada'] },
    { label: 'Ajuste Físico', value: 'ajuste_fisico', allowedTipos: ['ajuste'] },
    { label: 'Merma', value: 'merma', allowedTipos: ['salida'] },
    { label: 'Transferencia', value: 'transferencia', allowedTipos: ['entrada', 'salida'] },
    { label: 'Cotización Aprobada', value: 'cotizacion_aprobada', allowedTipos: ['salida'] },
];

export function MovimientoModal({ open, onClose, onSuccess, productoPreseleccionado }: MovimientoModalProps) {
    const [productos, setProductos] = useState<ProductoSimple[]>([]);
    const [almacenes, setAlmacenes] = useState<AlmacenSimple[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockDisponible, setStockDisponible] = useState<number | null>(null);
    const [selectedProducto, setSelectedProducto] = useState<ProductoSimple | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<MovimientoFormInput>({
        resolver: zodResolver(MovimientoSchema),
        defaultValues: {
            tipo: 'entrada',
            origen: 'compra',
            cantidad: 1,
            costo_unitario: null,
            observaciones: '',
        },
        mode: 'onChange',
    });

    const tipo = watch('tipo');
    const idProducto = watch('id_producto');
    const idAlmacen = watch('id_almacen');

    useEffect(() => {
        if (open) {
            const fetchFilters = async () => {
                try {
                    setLoadingFilters(true);
                    const [prodRes, almRes] = await Promise.all([
                        apiClient('/productos?limit=500&include=stock'),
                        apiClient('/almacenes?activo=true&limit=100'),
                    ]);
                    const prods = (prodRes.data || prodRes.items || []).map((p: any) => ({
                        id_producto: p.id_producto,
                        codigo: p.codigo,
                        descripcion: p.descripcion,
                        stock_total: p.stock_total || p.stock_actual?.[0]?.cantidad || 0,
                    }));
                    setProductos(prods);
                    setAlmacenes(almRes.data || almRes.items || []);
                    if (productoPreseleccionado) {
                        const prod = prods.find((p: ProductoSimple) => p.id_producto === productoPreseleccionado);
                        if (prod) {
                            setValue('id_producto', prod.id_producto);
                            setSelectedProducto(prod);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching filters:', error);
                } finally {
                    setLoadingFilters(false);
                }
            };
            fetchFilters();
        }
    }, [open, productoPreseleccionado, setValue]);

    useEffect(() => {
        if (idProducto && idAlmacen && tipo === 'salida') {
            const prod = productos.find((p) => p.id_producto === idProducto);
            const alm = almacenes.find((a) => a.id_almacen === idAlmacen);
            if (prod && alm) {
                const stockAlmacen = prod.stock_total;
                setStockDisponible(stockAlmacen);
            } else {
                setStockDisponible(null);
            }
        } else {
            setStockDisponible(null);
        }
    }, [idProducto, idAlmacen, tipo, productos, almacenes]);

    useEffect(() => {
        if (tipo === 'entrada') {
            setValue('origen', 'compra');
        } else if (tipo === 'salida') {
            setValue('origen', 'venta');
        } else if (tipo === 'ajuste') {
            setValue('origen', 'ajuste_fisico');
        }
    }, [tipo, setValue]);

    const getAllowedOrigenes = useCallback(() => {
        return ORIGEN_OPTIONS.filter((o) => o.allowedTipos.includes(tipo as 'entrada' | 'salida' | 'ajuste'));
    }, [tipo]);

    const handleClose = () => {
        reset();
        setSelectedProducto(null);
        setStockDisponible(null);
        onClose();
    };

    const onSubmit = async (data: MovimientoFormInput) => {
        setIsSubmitting(true);
        try {
            await inventarioApi.crearMovimiento(data);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error creating movimiento:', error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={handleClose} title="Registrar Movimiento de Inventario" maxWidth="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="PRODUCTO *"
                        error={errors.id_producto?.message}
                        disabled={loadingFilters}
                        {...register('id_producto', { valueAsNumber: true })}
                    >
                        <option value="">Seleccione un producto</option>
                        {productos.map((p) => (
                            <option key={p.id_producto} value={p.id_producto}>
                                {p.codigo} - {p.descripcion} (Stock: {p.stock_total})
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="ALMACÉN *"
                        error={errors.id_almacen?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen', { valueAsNumber: true })}
                    >
                        <option value="">Seleccione un almacén</option>
                        {almacenes.map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo} - {a.nombre}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-2">
                        TIPO DE MOVIMIENTO *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {TIPO_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = tipo === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setValue('tipo', opt.value)}
                                    className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        isSelected
                                            ? 'border-brand-primary bg-brand-primary/5 shadow-sm'
                                            : 'border-gray-200 hover:border-brand-primary/50'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${opt.color}`} />
                                    <span className="text-xs font-semibold text-brand-subtitle">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {errors.tipo && (
                        <p className="mt-1.5 text-xs text-rose-600">{errors.tipo.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-2">
                        ORIGEN / CONCEPTO *
                    </label>
                    <Select
                        label=""
                        error={errors.origen?.message}
                        {...register('origen')}
                    >
                        {getAllowedOrigenes().map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="CANTIDAD *"
                        type="number"
                        min="1"
                        placeholder="Ej: 100"
                        error={errors.cantidad?.message}
                        {...register('cantidad', { valueAsNumber: true })}
                    />

                    <Input
                        label="COSTO UNITARIO (opcional)"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 15.50"
                        error={errors.costo_unitario?.message}
                        {...register('costo_unitario', { valueAsNumber: true })}
                    />
                </div>

                {tipo === 'salida' && stockDisponible !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                            <span className="font-semibold">Stock disponible en almacén: </span>
                            {stockDisponible} unidades
                            {selectedProducto && ` (${selectedProducto.codigo} - ${selectedProducto.descripcion})`}
                        </div>
                    </div>
                )}

                <Input
                    label="OBSERVACIONES (opcional)"
                    placeholder="Motivo del movimiento, referencia, etc."
                    maxLength={500}
                    error={errors.observaciones?.message}
                    {...register('observaciones')}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" loading={isSubmitting}>
                        {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
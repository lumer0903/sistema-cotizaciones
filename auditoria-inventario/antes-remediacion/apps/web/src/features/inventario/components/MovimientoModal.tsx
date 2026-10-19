'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, ArrowDownLeft, Minus, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi } from '../api/inventario.api';
import { OrigenMovimiento } from '@goldcontinent/shared/constants/enums';
import { formatCode, formatText } from '@/lib/formatters';
import { showToast } from '@/lib/toast';
import { ProductoSearchField } from './ProductoSearchField';

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
    /** Existencias por almacén (para el aviso de salida). */
    stock_actual: Array<{ id_almacen: number; cantidad: number }>;
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
    almacenes?: AlmacenSimple[];
}

const TIPO_OPTIONS = [
    { label: 'Entrada (+)', value: 'entrada' as const, icon: ArrowDownLeft, color: 'text-estado-aprobado-text' },
    { label: 'Salida (-)', value: 'salida' as const, icon: ArrowUpRight, color: 'text-danger' },
    { label: 'Ajuste', value: 'ajuste' as const, icon: Minus, color: 'text-accent-ink' },
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

export function MovimientoModal({ open, onClose, onSuccess, productoPreseleccionado, almacenes: almacenesProp }: MovimientoModalProps) {
    const [productos, setProductos] = useState<ProductoSimple[]>([]);
    const [almacenes, setAlmacenes] = useState<AlmacenSimple[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockDisponible, setStockDisponible] = useState<number | null>(null);

    // Buscador con autocompletado (el listbox vive en ProductoSearchField)
    const [searchQuery, setSearchQuery] = useState('');
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

    const resetForm = useCallback(() => {
        reset();
        setSelectedProducto(null);
        setSearchQuery('');
        setStockDisponible(null);
    }, [reset]);

    const lastPreseleccion = useRef<number | null | undefined>(undefined);

    useEffect(() => {
        if (!open) {
            lastPreseleccion.current = productoPreseleccionado;
            return;
        }
        if (lastPreseleccion.current !== productoPreseleccionado) {
            const isFirstOpen = lastPreseleccion.current === undefined;
            if (!isFirstOpen || productoPreseleccionado) {
                resetForm();
            }
            lastPreseleccion.current = productoPreseleccionado;
        }
    }, [open, productoPreseleccionado, resetForm]);

    useEffect(() => {
        if (open) {
            const fetchFilters = async () => {
                try {
                    setLoadingFilters(true);
                    const almsProp = almacenesProp?.length ? almacenesProp : null;
                    const [prodRes, almRes] = await Promise.all([
                        apiClient('/productos?limit=500&include=stock'),
                        almsProp
                            ? Promise.resolve({ data: almsProp })
                            : apiClient('/almacenes?activo=true&limit=100'),
                    ]);
                    const prods = (prodRes.data || prodRes.items || []).map((p: any) => ({
                        id_producto: p.id_producto,
                        codigo: p.codigo,
                        descripcion: p.descripcion,
                        stock_total: p.stock_total || p.stock_actual?.[0]?.cantidad || 0,
                        stock_actual: p.stock_actual || [],
                    }));
                    setProductos(prods);
                    setAlmacenes(almRes.data || almRes.items || []);

                    if (productoPreseleccionado) {
                        const prod = prods.find((p: ProductoSimple) => p.id_producto === productoPreseleccionado);
                        if (prod) {
                            setValue('id_producto', prod.id_producto, { shouldValidate: true });
                            setSelectedProducto(prod);
                            setSearchQuery(`${formatCode(prod.codigo)} - ${prod.descripcion}`);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching filters:', error);
                    showToast.error('No se pudieron cargar productos o almacenes');
                } finally {
                    setLoadingFilters(false);
                }
            };
            fetchFilters();
        }
    }, [open, productoPreseleccionado, setValue, almacenesProp]);

    // Stock real del almacén seleccionado (sólo interesa para salidas).
    useEffect(() => {
        if (tipo !== 'salida' || !Number.isFinite(idProducto) || !Number.isFinite(idAlmacen) || !idProducto || !idAlmacen) {
            setStockDisponible(null);
            return;
        }
        const prod = productos.find((p) => p.id_producto === idProducto);
        if (!prod) {
            setStockDisponible(null);
            return;
        }
        const porAlmacen = prod.stock_actual.length
            ? prod.stock_actual.find((s) => s.id_almacen === idAlmacen)?.cantidad ?? 0
            : prod.stock_total;
        setStockDisponible(porAlmacen);
    }, [idProducto, idAlmacen, tipo, productos]);

    useEffect(() => {
        if (tipo === 'entrada') {
            setValue('origen', 'compra');
        } else if (tipo === 'salida') {
            setValue('origen', 'venta');
        } else if (tipo === 'ajuste') {
            setValue('origen', 'ajuste_fisico');
        }
    }, [tipo, setValue]);

    const handleSelectProducto = (p: ProductoSimple) => {
        setSelectedProducto(p);
        setValue('id_producto', p.id_producto, { shouldValidate: true });
        setSearchQuery(formatCode(p.codigo));
    };

    /** Píldora de stock total (todos los almacenes) para cada sugerencia. */
    const stockPill = (p: ProductoSimple) => `Stock: ${p.stock_total} u.`;

    const getAllowedOrigenes = useCallback(() => {
        return ORIGEN_OPTIONS.filter((o) => o.allowedTipos.includes(tipo as 'entrada' | 'salida' | 'ajuste'));
    }, [tipo]);

    const handleClose = () => {
        onClose();
    };

    const handleLimpiar = () => {
        resetForm();
    };

    const onSubmit = async (data: MovimientoFormInput) => {
        setIsSubmitting(true);
        try {
            await inventarioApi.crearMovimiento(data);
            resetForm();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating movimiento:', error);
            showToast.error(error?.response?.data?.message || error?.message || 'Error al registrar el movimiento');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            closeDisabled={isSubmitting}
            title="Registrar movimiento de inventario"
            maxWidth="lg"
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={handleLimpiar} disabled={isSubmitting}>
                        Limpiar
                    </Button>
                    <div className="flex gap-2 sm:gap-3">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="movimiento-form" variant="primary" loading={isSubmitting}>
                            Registrar movimiento
                        </Button>
                    </div>
                </>
            }
        >
            <form
                id="movimiento-form"
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
            >
                {/* Producto y almacén */}
                <div className="space-y-3.5">
                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                        <ProductoSearchField
                            productos={productos}
                            value={searchQuery}
                            onValueChange={(value) => {
                                setSearchQuery(value.toUpperCase());
                                if (selectedProducto) {
                                    setSelectedProducto(null);
                                    setValue('id_producto', 0, { shouldValidate: true });
                                }
                            }}
                            onSelect={handleSelectProducto}
                            error={errors.id_producto?.message}
                            label="Buscar producto"
                            placeholder="Buscar por código o nombre..."
                            stockPill={stockPill}
                        />

                        <Select
                            label="Almacén"
                            error={errors.id_almacen?.message}
                            disabled={loadingFilters}
                            {...register('id_almacen', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                            value={watch('id_almacen') ?? ''}
                        >
                            <option value="">Seleccionar</option>
                            {almacenes.map((a) => (
                                <option key={a.id_almacen} value={a.id_almacen}>
                                    {a.nombre ? `${a.codigo} - ${formatText(a.nombre)}` : a.codigo}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Tipo de movimiento */}
                <div className="space-y-3.5">
                    <div
                        role="group"
                        aria-label="Tipo de movimiento"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    >
                        {TIPO_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = tipo === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => setValue('tipo', opt.value)}
                                    className={`relative rounded-xl border-2 p-3 transition-[border-color,background-color,transform] duration-150 flex flex-col items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-[0.96] ${isSelected
                                            ? 'border-accent-primary bg-accent-primary/5 shadow-sm'
                                            : 'border-zinc-200 hover:border-accent-primary/50'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${opt.color}`} aria-hidden="true" />
                                    <span className="text-xs font-semibold text-brand-subtitle">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {errors.tipo && (
                        <p className="mt-1.5 text-xs text-danger" role="alert">{errors.tipo.message}</p>
                    )}
                </div>

                {/* Detalle del movimiento */}
                <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Select
                            label="Motivo"
                            error={errors.origen?.message}
                            {...register('origen')}
                            value={watch('origen') ?? ''}
                        >
                            {getAllowedOrigenes().map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>

                        <Input
                            label="Cantidad"
                            type="number"
                            min="1"
                            placeholder="Ej: 100"
                            error={errors.cantidad?.message}
                            {...register('cantidad', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                        />

                        <Input
                            label="Costo unitario (opcional)"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ej: 15.50"
                            error={errors.costo_unitario?.message}
                            {...register('costo_unitario', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                        />
                    </div>

                    {tipo === 'salida' && stockDisponible !== null && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-estado-enviado/30 bg-estado-enviado-soft px-3.5 py-2.5">
                            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-estado-enviado-text">
                                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                                Stock en el almacén
                            </span>
                            <span className="text-sm font-bold tabular-nums text-estado-enviado-text">
                                {stockDisponible} unidades
                            </span>
                        </div>
                    )}

                    {tipo === 'salida' &&
                        stockDisponible !== null &&
                        Number(watch('cantidad') || 0) > stockDisponible && (
                            <p className="text-xs font-medium text-danger" role="alert">
                                Stock insuficiente ({stockDisponible} unidades disponibles).
                            </p>
                        )}

                    <Input
                        label="Observaciones (opcional)"
                        placeholder="Motivo del movimiento, referencia, etc."
                        maxLength={500}
                        error={errors.observaciones?.message}
                        {...register('observaciones')}
                    />
                </div>
            </form>
        </Modal>
    );
}
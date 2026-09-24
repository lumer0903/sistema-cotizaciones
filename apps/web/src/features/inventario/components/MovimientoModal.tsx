'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, ArrowDownLeft, Minus, AlertCircle, Search } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi } from '../api/inventario.api';
import { OrigenMovimiento } from '@goldcontinent/shared/constants/enums';
import { formatCode, formatText } from '@/lib/formatters';
import { showToast } from '@/lib/toast';

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
    almacenes?: AlmacenSimple[];
}

const TIPO_OPTIONS = [
    { label: 'Entrada (+)', value: 'entrada' as const, icon: ArrowDownLeft, color: 'text-estado-aprobado-text' },
    { label: 'Salida (-)', value: 'salida' as const, icon: ArrowUpRight, color: 'text-danger' },
    { label: 'Ajuste', value: 'ajuste' as const, icon: Minus, color: 'text-brand-primary' },
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

    // Estado para el buscador y las sugerencias
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedProducto, setSelectedProducto] = useState<ProductoSimple | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const resetForm = () => {
        reset();
        setSelectedProducto(null);
        setSearchQuery('');
        setStockDisponible(null);
        setShowSuggestions(false);
    };

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
    }, [open, productoPreseleccionado]);

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

    useEffect(() => {
        if (Number.isFinite(idProducto) && Number.isFinite(idAlmacen) && idProducto && idAlmacen && tipo === 'salida') {
            const prod = productos.find((p) => p.id_producto === idProducto);
            const alm = almacenes.find((a) => a.id_almacen === idAlmacen);
            if (prod && alm) {
                setStockDisponible(prod.stock_total);
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

    // Cerrar desplegable al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sugerencias filtradas
    const sugerencias = productos.filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        return (
            p.codigo.toLowerCase().includes(query) ||
            p.descripcion.toLowerCase().includes(query)
        );
    });

    const handleSelectProducto = (p: ProductoSimple) => {
        setSelectedProducto(p);
        setValue('id_producto', p.id_producto, { shouldValidate: true });
        setSearchQuery(formatCode(p.codigo));
        setShowSuggestions(false);
    };

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
        <Modal open={open} onClose={handleClose} title="Registrar Movimiento de Inventario" maxWidth="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">

                    {/* BUSCADOR CON AUTOCOMPLETADO */}
                    <div className="relative flex flex-col" ref={dropdownRef}>
                        <Input
                            label="BUSCAR PRODUCTO"
                            placeholder="Buscar por código o nombre..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value.toUpperCase());
                                setShowSuggestions(true);
                                if (selectedProducto) {
                                    setSelectedProducto(null);
                                    setValue('id_producto', 0, { shouldValidate: true });
                                }
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            icon={<Search className="w-4 h-4 text-brand-options" />}
                            error={errors.id_producto?.message}
                            variant="modal"
                        />

                        {/* Desplegable de sugerencias alineado y acotado */}
                        {showSuggestions && searchQuery.trim().length > 0 && (
                            <div className="absolute top-full left-0 z-50 w-full min-w-[280px] bg-white border border-stone-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                                {sugerencias.length > 0 ? (
                                    sugerencias.slice(0, 3).map((p) => (
                                        <button
                                            key={p.id_producto}
                                            type="button"
                                            className="w-full text-left px-3.5 py-2.5 hover:bg-stone-50 transition-colors flex items-center justify-between border-b last:border-b-0 border-stone-100 gap-2"
                                            onClick={() => handleSelectProducto(p)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <span className="font-bold text-xs text-stone-800 block truncate">
                                                    {formatCode(p.codigo)}
                                                </span>
                                                <span className="text-[11px] text-stone-500 truncate block">
                                                    {p.descripcion}
                                                </span>
                                            </div>
                                            <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600 shrink-0">
                                                Stock: {p.stock_total} u.
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

                    <Select
                        label="ALMACÉN"
                        error={errors.id_almacen?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen', {
                            setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                        })}
                        variant="modal"
                    >
                        <option value="">Seleccionar</option>
                        {almacenes.map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo}
                            </option>
                        ))}
                    </Select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-2">
                        TIPO DE MOVIMIENTO
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
                                    className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected
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
                        <p className="mt-1.5 text-xs text-danger">{errors.tipo.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Select
                        label="MOTIVO"
                        error={errors.origen?.message}
                        {...register('origen')}
                        variant="modal"
                    >
                        {getAllowedOrigenes().map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </Select>

                    <Input
                        label="CANTIDAD"
                        type="number"
                        min="1"
                        placeholder="Ej: 100"
                        error={errors.cantidad?.message}
                        {...register('cantidad', {
                            setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                        })}
                        variant="modal"
                    />

                    <Input
                        label="COSTO UNITARIO (OPCIONAL)"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ej: 15.50"
                        error={errors.costo_unitario?.message}
                        {...register('costo_unitario', {
                            setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                        })}
                        variant="modal"
                    />
                </div>

                {tipo === 'salida' && stockDisponible !== null && (
                    <div className="bg-estado-enviado-soft border border-estado-enviado/30 rounded-xl px-3 py-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-estado-enviado flex-shrink-0" />
                        <div className="text-xs text-estado-enviado-text">
                            <span className="font-semibold">Stock disponible en almacén: </span>
                            {stockDisponible} unidades
                            {selectedProducto && ` (${formatCode(selectedProducto.codigo)} - ${formatText(selectedProducto.descripcion)})`}
                        </div>
                    </div>
                )}

                <Input
                    label="OBSERVACIONES (OPCIONAL)"
                    placeholder="Motivo del movimiento, referencia, etc."
                    maxLength={500}
                    error={errors.observaciones?.message}
                    {...register('observaciones')}
                    variant="modal"
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="ghost" onClick={handleLimpiar} disabled={isSubmitting}>
                        Limpiar
                    </Button>
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
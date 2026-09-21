'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi, TransferenciaFormData } from '../api/inventario.api';

const TransferenciaSchema = z.object({
    id_producto: z.number().min(1, 'Seleccione un producto'),
    id_almacen_origen: z.number().min(1, 'Seleccione almacén de origen'),
    id_almacen_destino: z.number().min(1, 'Seleccione almacén de destino'),
    cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
    observaciones: z.string().max(500).optional(),
}).refine((data) => data.id_almacen_origen !== data.id_almacen_destino, {
    message: 'El almacén de origen y destino deben ser diferentes',
    path: ['id_almacen_destino'],
});

type TransferenciaFormInput = z.infer<typeof TransferenciaSchema>;

interface ProductoSimple {
    id_producto: number;
    codigo: string;
    descripcion: string;
    stock_actual: Array<{
        id_almacen: number;
        cantidad: number;
        almacen: { id_almacen: number; nombre: string; codigo: string };
    }>;
}

interface AlmacenSimple {
    id_almacen: number;
    codigo: string;
    nombre: string;
}

interface TransferenciaModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    productoPreseleccionado?: number | null;
}

export function TransferenciaModal({ open, onClose, onSuccess, productoPreseleccionado }: TransferenciaModalProps) {
    const [productos, setProductos] = useState<ProductoSimple[]>([]);
    const [almacenes, setAlmacenes] = useState<AlmacenSimple[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockOrigen, setStockOrigen] = useState<number | null>(null);
    const [selectedProducto, setSelectedProducto] = useState<ProductoSimple | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<TransferenciaFormInput>({
        resolver: zodResolver(TransferenciaSchema),
        defaultValues: {
            cantidad: 1,
            observaciones: '',
        },
        mode: 'onChange',
    });

    const idProducto = watch('id_producto');
    const idAlmacenOrigen = watch('id_almacen_origen');

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
                        stock_actual: p.stock_actual || [],
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
        if (idProducto && idAlmacenOrigen) {
            const prod = productos.find((p) => p.id_producto === idProducto);
            if (prod) {
                const stock = prod.stock_actual.find((s) => s.id_almacen === idAlmacenOrigen);
                setStockOrigen(stock?.cantidad ?? 0);
            } else {
                setStockOrigen(null);
            }
        } else {
            setStockOrigen(null);
        }
    }, [idProducto, idAlmacenOrigen, productos]);

    const getAlmacenesDestino = useCallback(() => {
        return almacenes.filter((a) => a.id_almacen !== idAlmacenOrigen);
    }, [almacenes, idAlmacenOrigen]);

    const handleClose = () => {
        reset();
        setSelectedProducto(null);
        setStockOrigen(null);
        onClose();
    };

    const onSubmit = async (data: TransferenciaFormInput) => {
        setIsSubmitting(true);
        try {
            await inventarioApi.crearTransferencia(data);
            if (onSuccess) onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Error creating transferencia:', error);
            throw error;
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <Modal open={open} onClose={handleClose} title="Transferencia entre Almacenes" maxWidth="lg">
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
                                {p.codigo} - {p.descripcion}
                            </option>
                        ))}
                    </Select>

                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-1.5">
                            STOCK POR ALMACÉN (referencia)
                        </label>
                        {selectedProducto && selectedProducto.stock_actual.length > 0 ? (
                            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 max-h-40 overflow-y-auto">
                                {selectedProducto.stock_actual.map((s) => (
                                    <div
                                        key={s.id_almacen}
                                        className="flex justify-between py-1.5 border-b border-gray-200/50 last:border-0 text-xs"
                                    >
                                        <span className="text-brand-options">{s.almacen?.codigo} - {s.almacen?.nombre}</span>
                                        <span className="font-bold text-brand-subtitle">{s.cantidad} u.</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3 text-center text-xs text-brand-options">
                                Seleccione un producto para ver stock por almacén
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                        label="ALMACÉN ORIGEN *"
                        error={errors.id_almacen_origen?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen_origen', { valueAsNumber: true })}
                    >
                        <option value="">Seleccione almacén origen</option>
                        {almacenes.map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo} - {a.nombre}
                            </option>
                        ))}
                    </Select>

                    <Select
                        label="ALMACÉN DESTINO *"
                        error={errors.id_almacen_destino?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen_destino', { valueAsNumber: true })}
                    >
                        <option value="">Seleccione almacén destino</option>
                        {getAlmacenesDestino().map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo} - {a.nombre}
                            </option>
                        ))}
                    </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                        label="CANTIDAD A TRANSFERIR *"
                        type="number"
                        min="1"
                        placeholder="Ej: 50"
                        error={errors.cantidad?.message}
                        {...register('cantidad', { valueAsNumber: true })}
                    />

                    {stockOrigen !== null && (
                        <div className="flex items-end">
                            <label className="block w-full">
                                <span className="block text-xs font-bold text-brand-subtitle uppercase tracking-wider mb-1.5">
                                    STOCK EN ORIGEN
                                </span>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-blue-800">Disponible</span>
                                        <span className="font-bold text-blue-800 text-lg">{stockOrigen} unidades</span>
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}
                </div>

                {idAlmacenOrigen && idProducto && stockOrigen !== null && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="text-xs text-amber-800">
                            <span className="font-semibold">Validación: </span>
                            El almacén de origen tiene {stockOrigen} unidades disponibles.
                            {Number(watch('cantidad') || 0) > stockOrigen && ' ⚠️ Stock insuficiente para la cantidad solicitada.'}
                        </div>
                    </div>
                )}

                <Input
                    label="OBSERVACIONES (opcional)"
                    placeholder="Motivo de la transferencia, referencia, etc."
                    maxLength={500}
                    error={errors.observaciones?.message}
                    {...register('observaciones')}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" variant="primary" loading={isSubmitting}>
                        {isSubmitting ? 'Transfiriendo...' : 'Realizar Transferencia'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
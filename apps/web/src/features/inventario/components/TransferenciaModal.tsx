'use client';
import { useInventoryProducts } from '../useInventoryProducts';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi } from '../api/inventario.api';
import { formatCode, formatText } from '@/lib/formatters';
import { showToast } from '@/lib/toast';
import { ProductoSearchField } from './ProductoSearchField';

const TransferenciaSchema = z.object({
    id_producto: z.number().min(1, 'Seleccione un producto'),
    id_almacen_origen: z.number().min(1, 'Seleccione almacén de origen'),
    id_almacen_destino: z.number().min(1, 'Seleccione almacén de destino'),
    cantidad: z.number().int('Use unidades enteras').min(1, 'La cantidad debe ser mayor a 0'),
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
    almacenes?: AlmacenSimple[];
}

export function TransferenciaModal({ open, onClose, onSuccess, productoPreseleccionado, almacenes: almacenesProp }: TransferenciaModalProps) {
    const [almacenes, setAlmacenes] = useState<AlmacenSimple[]>([]);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stockOrigen, setStockOrigen] = useState<number | null>(null);

    // Buscador con autocompletado (el listbox vive en ProductoSearchField)
    const [searchQuery, setSearchQuery] = useState('');
    const remote = useInventoryProducts(open, searchQuery, productoPreseleccionado);
    const productos = remote.productos;
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

    const resetForm = useCallback(() => {
        reset();
        setSelectedProducto(null);
        setSearchQuery('');
        setStockOrigen(null);
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
        if(!open) return;
        const controller=new AbortController();let current=true;
        setLoadingFilters(true);
        const request=almacenesProp?.length ? Promise.resolve({data:almacenesProp})
          : apiClient('/almacenes?activo=true&limit=100',{signal:controller.signal});
        request.then(res=>{if(current)setAlmacenes(res.data||[]);})
          .catch(err=>{if(current)showToast.error(err.message||'No se pudieron cargar almacenes');})
          .finally(()=>{if(current)setLoadingFilters(false);});
        return ()=>{current=false;controller.abort();};
    },[open,almacenesProp]);
    useEffect(()=>{
        if(!open || !remote.preselected) return;
        setSelectedProducto(remote.preselected);
        setValue('id_producto',remote.preselected.id_producto,{shouldValidate:true});
        setSearchQuery(formatCode(remote.preselected.codigo));
    },[open,remote.preselected,setValue]);


    useEffect(() => {
        if (Number.isFinite(idProducto) && Number.isFinite(idAlmacenOrigen) && idProducto && idAlmacenOrigen) {
            const prod = selectedProducto?.id_producto === idProducto ? selectedProducto : null;
            if (prod) {
                const stock = prod.stock_actual.find((s) => s.id_almacen === idAlmacenOrigen);
                setStockOrigen(stock?.cantidad ?? 0);
            } else {
                setStockOrigen(null);
            }
        } else {
            setStockOrigen(null);
        }
    }, [idProducto, idAlmacenOrigen, selectedProducto]);

    const handleSelectProducto = (p: ProductoSimple) => {
        setSelectedProducto(p);
        setValue('id_producto', p.id_producto, { shouldValidate: true });
        setSearchQuery(formatCode(p.codigo));
    };

    /** Píldora de stock total (todos los almacenes) para cada sugerencia. */
    const stockPill = (p: ProductoSimple) =>
        `Stock: ${p.stock_actual.reduce((acc, curr) => acc + curr.cantidad, 0)} u.`;

    const getAlmacenesDestino = useCallback(() => {
        return almacenes.filter((a) => a.id_almacen !== idAlmacenOrigen);
    }, [almacenes, idAlmacenOrigen]);

    /** Etiqueta de opción: "ALM-01 - Principal" (código + nombre). */
    const labelAlmacen = (a: AlmacenSimple) =>
        `${a.codigo}${a.nombre ? ` - ${formatText(a.nombre)}` : ''}`;

    const handleClose = () => {
        onClose();
    };

    const handleLimpiar = () => {
        resetForm();
    };

    const onSubmit = async (data: TransferenciaFormInput) => {
        setIsSubmitting(true);
        try {
            await inventarioApi.crearTransferencia(data);
            resetForm();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating transferencia:', error);
            showToast.error(error?.response?.data?.message || error?.message || 'Error al realizar la transferencia');
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
            title="Transferencia entre almacenes"
            maxWidth="md"
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={handleLimpiar} disabled={isSubmitting}>
                        Limpiar
                    </Button>
                    <div className="flex gap-2 sm:gap-3">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            form="transferencia-form"
                            variant="primary"
                            loading={isSubmitting}
                        >
                            Realizar transferencia
                        </Button>
                    </div>
                </>
            }
        >
            <form
                id="transferencia-form"
                noValidate
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
            >
                {/* Producto y almacenes */}
                <div className="space-y-3.5">
                    <ProductoSearchField
                        productos={productos}
                            loading={remote.loading}
                            loadError={remote.error}
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select
                            label="Almacén origen"
                            error={errors.id_almacen_origen?.message}
                            disabled={loadingFilters}
                            {...register('id_almacen_origen', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                            value={watch('id_almacen_origen') ?? ''}
                        >
                            <option value="">Seleccionar</option>
                            {almacenes.map((a) => (
                                <option key={a.id_almacen} value={a.id_almacen}>
                                    {labelAlmacen(a)}
                                </option>
                            ))}
                        </Select>

                        <Select
                            label="Almacén destino"
                            error={errors.id_almacen_destino?.message}
                            disabled={loadingFilters}
                            {...register('id_almacen_destino', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                            value={watch('id_almacen_destino') ?? ''}
                        >
                            <option value="">Seleccionar</option>
                            {getAlmacenesDestino().map((a) => (
                                <option key={a.id_almacen} value={a.id_almacen}>
                                    {labelAlmacen(a)}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Cantidad y detalle */}
                <div className="space-y-3.5">
                    {stockOrigen !== null && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-estado-enviado/30 bg-estado-enviado-soft px-3.5 py-2.5">
                            <span className="text-xs font-bold tracking-wider text-estado-enviado-text">
                                Stock en origen
                            </span>
                            <span className="text-sm font-bold tabular-nums text-estado-enviado-text">
                                {stockOrigen} unidades
                            </span>
                        </div>
                    )}

                    {Number.isFinite(idAlmacenOrigen) &&
                        Number.isFinite(idProducto) &&
                        stockOrigen !== null &&
                        (stockOrigen === 0 || Number(watch('cantidad') || 0) > stockOrigen) && (
                            <p className="text-xs font-medium text-danger" role="alert">
                                {stockOrigen === 0
                                    ? 'El almacén de origen no cuenta con stock disponible.'
                                    : `Stock insuficiente (${stockOrigen} unidades disponibles).`}
                            </p>
                        )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Cantidad a transferir"
                            type="number"
                            min="1"
                            placeholder="Ej: 50"
                            error={errors.cantidad?.message}
                            {...register('cantidad', {
                                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
                            })}
                        />

                        <Input
                            label="Observaciones (opcional)"
                            placeholder="Motivo de la transferencia, referencia, etc."
                            maxLength={500}
                            error={errors.observaciones?.message}
                            {...register('observaciones')}
                        />
                    </div>
                </div>

                {almacenes.length > 0 && almacenes.length < 2 && (
                    <p className="text-xs font-medium text-danger" role="alert">
                        Se necesitan al menos 2 almacenes activos para realizar transferencias.
                    </p>
                )}
            </form>
        </Modal>
    );
}
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Modal, Input, Select, Button } from '@/components/ui';
import { inventarioApi } from '../api/inventario.api';
import { formatCode } from '@/lib/formatters';

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

    // Estado para el buscador basado en tu patrón
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
                            setValue('id_producto', prod.id_producto, { shouldValidate: true });
                            setSelectedProducto(prod);
                            setSearchQuery(`${formatCode(prod.codigo)} - ${prod.descripcion}`);
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

    const getAlmacenesDestino = useCallback(() => {
        return almacenes.filter((a) => a.id_almacen !== idAlmacenOrigen);
    }, [almacenes, idAlmacenOrigen]);

    const handleClose = () => {
        reset();
        setSelectedProducto(null);
        setSearchQuery('');
        setStockOrigen(null);
        setShowSuggestions(false);
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
        <Modal open={open} onClose={handleClose} title="Transferencia entre Almacenes" maxWidth="md">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                {/* BUSCADOR CON AUTOCOMPLETADO */}
                <div className="relative mb-4" ref={dropdownRef}>
                    <Input
                        label="BUSCAR PRODUCTO"
                        placeholder="Buscar"
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

                    {/* Desplegable de sugerencias (Máximo 3 opciones) */}
                    {showSuggestions && searchQuery.trim().length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-stone-200 rounded-lg shadow-lg mt-1 overflow-hidden">
                            {sugerencias.length > 0 ? (
                                sugerencias.slice(0, 3).map((p) => {
                                    const stockTotal = p.stock_actual.reduce((acc, curr) => acc + curr.cantidad, 0);

                                    return (
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
                                                    {p.descripcion}
                                                </span>
                                            </div>
                                            <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-600">
                                                Stock: {stockTotal} u.
                                            </span>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-3 text-xs text-stone-400 text-center">
                                    No se encontraron productos coincidentes
                                </div>
                            )}
                        </div>
                    )}

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select
                        label="ALMACÉN ORIGEN"
                        error={errors.id_almacen_origen?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen_origen', { valueAsNumber: true })}
                        variant="modal"
                    >
                        <option value="">Seleccionar</option>
                        {almacenes.map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo}
                            </option>
                        ))}
                    </Select>

                    <Input
                        label="CANTIDAD A TRANSFERIR"
                        type="number"
                        min="1"
                        placeholder="Ej: 50"
                        error={errors.cantidad?.message}
                        {...register('cantidad', { valueAsNumber: true })}
                        variant="modal"
                    />

                    <Select
                        label="ALMACÉN DESTINO"
                        error={errors.id_almacen_destino?.message}
                        disabled={loadingFilters}
                        {...register('id_almacen_destino', { valueAsNumber: true })}
                        variant="modal"
                    >
                        <option value="">Seleccionar</option>
                        {getAlmacenesDestino().map((a) => (
                            <option key={a.id_almacen} value={a.id_almacen}>
                                {a.codigo}
                            </option>
                        ))}
                    </Select>


                </div>

                <div className="space-y-1.5">
                    {stockOrigen !== null && (
                        <div className="flex flex-col">
                            <span className="block text-[11px] font-bold text-brand-subtitle uppercase tracking-wider mb-1.5">
                                STOCK EN ORIGEN
                            </span>
                            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 h-[46px] flex items-center justify-between">
                                <span className="text-m text-blue-900 font-bold">DISPONIBLE</span>
                                <span className="font-bold text-blue-900 text-base">{stockOrigen} UNIDADES</span>
                            </div>
                        </div>
                    )}

                    {idAlmacenOrigen && idProducto && stockOrigen !== null && (stockOrigen === 0 || Number(watch('cantidad') || 0) > stockOrigen) && (
                        <p className="animate-in fade-in slide-in-from-top-1 duration-200 text-xs font-medium text-red-600 mt-1.5">
                            * {stockOrigen === 0
                                ? "El almacén de origen no cuenta con stock disponible."
                                : `Stock insuficiente (${stockOrigen} unidades disponibles).`}
                        </p>
                    )}
                </div>

                <Input
                    label="OBSERVACIONES (opcional)"
                    placeholder="Motivo de la transferencia, referencia, etc."
                    maxLength={500}
                    error={errors.observaciones?.message}
                    {...register('observaciones')}
                    variant="modal"
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
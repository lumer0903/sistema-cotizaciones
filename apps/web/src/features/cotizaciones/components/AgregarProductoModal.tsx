'use client';
import { Checkbox } from '@/components/ui/Checkbox';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Package, Info } from 'lucide-react';
import { ProductoCarrito } from '../types/cotizacion';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getImageUrl } from '@/lib/imageUtils';
import { formatCode, obtenerPreciosEstandarizados } from '@/lib/formatters';

export interface ColorDisponible {
    nombre: string;
    stock: number;
}

export interface ProductoBase {
    id?: string | number;
    id_producto?: number;
    codigo: string;
    descripcion: string;
    foto_url?: string | null;
    imagenUrl?: string | null;
    estante?: string;
    stockAlerta?: number;
    stockTotal?: number;
    stock_total?: number;
    stock?: number;
    coloresDisponibles?: ColorDisponible[];
    colores_surtido?: string[];
    precios?: {
        // Formato API backend (snake_case)
        precio_unidad_normal?: number;
        precio_docena_normal?: number;
        precio_mayor_normal?: number;
        precio_unidad_dist?: number;
        precio_docena_dist?: number;
        precio_mayor_dist?: number;
        // Formato UI alternativo (camelCase / nested)
        distribuidor?: { unidad?: number; docena?: number; mayor?: number };
        tienda?: { unidad?: number; docena?: number; mayor?: number };
    };
    [key: string]: any;
}

interface AgregarProductoModalProps {
    isOpen: boolean;
    onClose: () => void;
    producto: ProductoBase | null;
    tipoPrecioCliente: 'DISTRIBUIDOR' | 'TIENDA' | string;
    onAgregar: (item: ProductoCarrito) => void;
    /** Cantidad inicial (flujo de recomendaciones: p.ej. la del producto a reemplazar) */
    cantidadInicial?: number;
    /** Precio inicial precargado (flujo de recomendaciones); si no se pasa se usa la tabla de precios */
    precioInicial?: number;
    /** Tipo de venta inicial (default 'MAYOR') */
    tipoVentaInicial?: 'UNIDAD' | 'DOCENA' | 'MAYOR';
    /** Aviso superior, p.ej. "Reemplazando V-GR55-01 por V-GR55-02" */
    aviso?: string | null;
    /** Label del botón de confirmación (default 'Guardar') */
    confirmLabel?: string;
}

export default function AgregarProductoModal({
    isOpen,
    onClose,
    producto,
    tipoPrecioCliente,
    onAgregar,
    cantidadInicial,
    precioInicial,
    tipoVentaInicial,
    aviso,
    confirmLabel = 'Guardar',
}: AgregarProductoModalProps) {
    const [tipoColor, setTipoColor] = useState<'SURTIDO' | 'ESPECIFICO'>('SURTIDO');
    const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
    const [tipoVenta, setTipoVenta] = useState<'UNIDAD' | 'DOCENA' | 'MAYOR' | ''>('MAYOR');
    const [cantidad, setCantidad] = useState<number>(1);
    const [precioInput, setPrecioInput] = useState<string>('0.00');
    const [failedImage, setFailedImage] = useState<string | null>(null);
    const [prevReset, setPrevReset] = useState<{
        isOpen: boolean;
        producto: ProductoBase | null;
        tipoPrecioCliente: string;
        cantidadInicial?: number;
        precioInicial?: number;
        tipoVentaInicial?: string;
    } | null>(null);

    // Extracción segura de los 6 precios (tienda + distribuidor) desde cualquier forma del producto
    const { tienda, distribuidor } = useMemo(
        () => obtenerPreciosEstandarizados(producto),
        [producto]
    );

    const esTienda = String(tipoPrecioCliente).toUpperCase() === 'TIENDA';
    const preciosPorCliente = esTienda ? tienda : distribuidor;

    // Sincroniza el input de precio al abrir el modal / cambiar producto o tipo de cliente
    if (
        prevReset === null ||
        prevReset.isOpen !== isOpen ||
        prevReset.producto !== producto ||
        prevReset.tipoPrecioCliente !== tipoPrecioCliente ||
        prevReset.cantidadInicial !== cantidadInicial ||
        prevReset.precioInicial !== precioInicial ||
        prevReset.tipoVentaInicial !== tipoVentaInicial
    ) {
        setPrevReset({ isOpen, producto, tipoPrecioCliente, cantidadInicial, precioInicial, tipoVentaInicial });
        if (isOpen && producto) {
            setTipoColor('SURTIDO');
            setColorSeleccionado('');
            setTipoVenta(tipoVentaInicial ?? 'MAYOR');
            setCantidad(cantidadInicial ?? 1);
            const inicial = precioInicial ?? (esTienda ? tienda.mayor : distribuidor.mayor);
            setPrecioInput(Number(inicial || 0).toFixed(2));
            setFailedImage(null);
        }
    }

    const precioNum = useMemo(() => {
        const val = parseFloat(precioInput);
        return isNaN(val) ? 0 : val;
    }, [precioInput]);

    const subtotal = useMemo(() => precioNum * cantidad, [precioNum, cantidad]);

    // Cálculo y fallback de stocks
    const stockTotalDisplay = producto?.stock_total ?? producto?.stockTotal ?? producto?.stock ?? 0;

    const coloresDisponibles = producto?.coloresDisponibles;

    const stockColorSeleccionado = useMemo(() => {
        if (tipoColor === 'SURTIDO') return stockTotalDisplay;
        if (!colorSeleccionado || !coloresDisponibles) return stockTotalDisplay;

        const encontrado = coloresDisponibles.find((c) => c.nombre === colorSeleccionado);
        return encontrado ? encontrado.stock : 0;
    }, [tipoColor, colorSeleccionado, coloresDisponibles, stockTotalDisplay]);

    // Validación para bloquear o permitir guardar
    const sinStock = tipoColor === 'ESPECIFICO' && colorSeleccionado !== '' && stockColorSeleccionado <= 0;

    if (!isOpen || !producto) return null;

    const handleTipoVentaChange = (nuevoTipo: 'UNIDAD' | 'DOCENA' | 'MAYOR') => {
        setTipoVenta(nuevoTipo);
        if (nuevoTipo === 'UNIDAD') setPrecioInput(Number(preciosPorCliente.unidad || 0).toFixed(2));
        if (nuevoTipo === 'DOCENA') setPrecioInput(Number(preciosPorCliente.docena || 0).toFixed(2));
        if (nuevoTipo === 'MAYOR') setPrecioInput(Number(preciosPorCliente.mayor || 0).toFixed(2));
    };

    const handleGuardar = () => {
        if (sinStock) return;

        const p = producto as any;
        onAgregar({
            id: Date.now().toString(),
            id_producto: Number(p.id_producto ?? p.id ?? 0) || undefined,
            codigo: producto.codigo,
            descripcion: `${producto.descripcion}${colorSeleccionado ? ` (${colorSeleccionado})` : ''}`,
            precioUnitario: precioNum,
            cantidad,
            total: subtotal,
            tipo_venta: tipoVenta || 'MAYOR',
            stock: Number(stockTotalDisplay || 0),
            almacen: p.almacen?.nombre || p.stock_actual?.[0]?.almacen?.nombre,
            ubicacion: p.almacen?.ubicacion || p.stock_actual?.[0]?.almacen?.ubicacion || p.estante,
        });
        onClose();
    };

    const stockAlertaDisplay = producto.stockAlerta ?? producto.stock_minimo ?? 20;
    const estanteDisplay = producto.estante || 'Estante B';
    const tituloEscala = esTienda ? 'PRECIO TIENDA' : 'PRECIO DISTRIBUIDOR';
    const preciosDisplay = preciosPorCliente;

    // Imagen final procesada por getImageUrl
    const imagenSrc = getImageUrl(producto.foto_url || producto.imagenUrl);

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            title="Agregar Producto"
            maxWidth="md"
        >
            <div className="space-y-5 text-zinc-700 p-1">
                {/* Aviso contextual (flujo de recomendaciones: reemplazo) */}
                {aviso && (
                    <div className="flex items-center gap-2 rounded-xl border border-accent-primary/30 bg-accent-soft px-3.5 py-2.5 text-sm font-semibold text-brand-subtitle">
                        <Info className="size-4 shrink-0 text-accent-ink" />
                        <span>{aviso}</span>
                    </div>
                )}

                {/* Ficha de producto con manejo de errores de imagen */}
                <div className="border border-border-default rounded-2xl p-3.5 flex gap-3.5 bg-surface items-center">
                    <div className="size-20 rounded-xl border border-border-default flex items-center justify-center overflow-hidden bg-zinc-50 shrink-0">
                        {imagenSrc && failedImage !== imagenSrc ? (
                            <Image
                                unoptimized
                                src={imagenSrc}
                                alt={producto.descripcion}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={() => setFailedImage(imagenSrc)}
                            />
                        ) : (
                            <Package className="size-8 text-brand-options" />
                        )}
                    </div>
                    <div className="flex flex-col justify-between py-0.5 min-w-0 flex-1 gap-1">
                        <div>
                            <span className="inline-flex items-center gap-1.5 text-zinc-600 text-xs font-bold">
                                <span className="size-2 rounded-full bg-zinc-400" aria-hidden="true" />
                                {formatCode(producto.codigo)}
                            </span>
                            <p className="text-sm text-zinc-700 font-medium leading-tight truncate mt-1">
                                {producto.descripcion}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm pt-1">
                            <span className="inline-flex items-center gap-1.5 text-zinc-600 font-medium">
                                <span className="size-2 rounded-full bg-zinc-400" aria-hidden="true" />
                                {estanteDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-estado-rechazado-soft text-danger font-bold px-2 py-0.5 rounded-md">
                                <Package className="size-3" />
                                {stockAlertaDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-estado-aprobado-soft text-estado-aprobado-text font-bold px-2 py-0.5 rounded-md">
                                <span className="size-1.5 rounded-full bg-estado-aprobado" />
                                {stockTotalDisplay}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tipo de Venta por Color (Checkbox con accent-amber-500) */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-zinc-600">
                        Tipo de venta en color
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer select-none">
                            <Checkbox
                                
                                checked={tipoColor === 'SURTIDO'}
                                onChange={() => setTipoColor('SURTIDO')}
                                
                            />
                            Surtido
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer select-none">
                            <Checkbox
                                
                                checked={tipoColor === 'ESPECIFICO'}
                                onChange={() => setTipoColor('ESPECIFICO')}
                                
                            />
                            Color específico
                        </label>
                    </div>
                </div>

                {/* Selección y Validación de Color Específico */}
                {tipoColor === 'ESPECIFICO' && (
                    <div className="space-y-1.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Select
                                label="Seleccionar color"
                                variant="modal"
                                value={colorSeleccionado}
                                onChange={(e) => setColorSeleccionado(String(e.target.value))}
                                options={[
                                    { label: 'Seleccionar', value: '' },
                                    ...(producto.coloresDisponibles?.map((c) => ({ label: c.nombre, value: c.nombre })) ||
                                        producto.colores_surtido?.map((c) => ({ label: c, value: c })) || []),
                                ]}
                                className="w-full"
                            />
                            <Input
                                label="Estado de stock"
                                readOnly
                                value={`${stockColorSeleccionado} un.`}
                                error={sinStock ? 'Sin stock disponible para el color seleccionado.' : undefined}
                                className={`font-semibold ${!sinStock ? '!bg-zinc-50' : ''}`}
                            />
                        </div>
                    </div>
                )}

                {/* Tipo de Venta y Cantidad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                        label="Tipo de venta"
                        variant="modal"
                        value={tipoVenta}
                        onChange={(e) => handleTipoVentaChange(String(e.target.value) as any)}
                        options={[
                            { label: 'Seleccionar', value: '' },
                            { label: 'Unidad', value: 'UNIDAD' },
                            { label: 'Docena', value: 'DOCENA' },
                            { label: 'Por Mayor', value: 'MAYOR' },
                        ]}
                        className="w-full"
                    />
                    <Input
                        label="Cantidad"
                        type="number"
                        min={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                        className="font-semibold"
                    />
                </div>

                {/* Precio y Subtotal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Precio"
                        type="number"
                        step="0.01"
                        icon={<span className="text-xs font-semibold">S/</span>}
                        value={precioInput}
                        onChange={(e) => setPrecioInput(e.target.value)}
                        className="font-semibold"
                    />
                    <Input
                        label="Subtotal"
                        readOnly
                        icon={<span className="text-xs font-semibold">S/</span>}
                        value={subtotal.toFixed(2)}
                        className="!bg-zinc-50 font-bold"
                    />
                </div>

                {/* Escala de Precios Dinámica (Distribuidor vs. Tienda) */}
                <div
                    className={`w-full rounded-2xl border p-3 transition-colors ${esTienda
                        ? 'bg-role-tienda-soft border-role-tienda/30 text-role-tienda'
                        : 'bg-role-distribuidor-soft border-role-distribuidor/30 text-role-distribuidor'
                        }`}
                >
                    <span className="text-center text-sm font-extrabold block mb-2">
                        {tituloEscala}
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-current/20 text-center">
                        <div className="px-2">
                            <span className="block text-sm font-bold">
                                Unidad
                            </span>
                            <span className="text-sm font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.unidad || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="px-2">
                            <span className="block text-sm font-bold">
                                Docena
                            </span>
                            <span className="text-sm font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.docena || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="px-2">
                            <span className="block text-sm font-bold">
                                Mayor
                            </span>
                            <span className="text-sm font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.mayor || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleGuardar}
                        disabled={sinStock}
                        className={`px-8 py-2.5 text-sm font-bold rounded-xl shadow-none transition-colors ${sinStock
                            ? 'bg-zinc-200 text-brand-options cursor-not-allowed'
                            : 'bg-accent-primary hover:bg-accent-hover text-on-accent'
                            }`}
                    >
                        {confirmLabel}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="min-h-11 px-5 text-sm font-bold text-brand-options hover:text-zinc-600 transition-colors"
                    >
                        Cancelar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

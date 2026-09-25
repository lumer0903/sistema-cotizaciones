'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Package, Archive } from 'lucide-react';
import { ProductoCarrito } from '../types/cotizacion';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
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
}

export default function AgregarProductoModal({
    isOpen,
    onClose,
    producto,
    tipoPrecioCliente,
    onAgregar,
}: AgregarProductoModalProps) {
    const [tipoColor, setTipoColor] = useState<'SURTIDO' | 'ESPECIFICO'>('SURTIDO');
    const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
    const [tipoVenta, setTipoVenta] = useState<'UNIDAD' | 'DOCENA' | 'MAYOR' | ''>('MAYOR');
    const [cantidad, setCantidad] = useState<number>(1);
    const [precioInput, setPrecioInput] = useState<string>('0.00');
    const [imgError, setImgError] = useState<boolean>(false);
    const [prevReset, setPrevReset] = useState<{
        isOpen: boolean;
        producto: ProductoBase | null;
        tipoPrecioCliente: string;
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
        prevReset.tipoPrecioCliente !== tipoPrecioCliente
    ) {
        setPrevReset({ isOpen, producto, tipoPrecioCliente });
        if (isOpen && producto) {
            setTipoColor('SURTIDO');
            setColorSeleccionado('');
            setTipoVenta('MAYOR');
            setCantidad(1);
            const inicial = esTienda ? tienda.mayor : distribuidor.mayor;
            setPrecioInput(Number(inicial || 0).toFixed(2));
            setImgError(false);
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
                {/* Ficha de producto con manejo de errores de imagen */}
                <div className="border border-zinc-200 rounded-2xl p-3.5 flex gap-3.5 bg-white items-center">
                    <div className="size-20 rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden bg-zinc-50 shrink-0">
                        {imagenSrc && !imgError ? (
                            <Image
                                src={getImageUrl(producto.foto_url || producto.imagenUrl)}
                                alt={producto.descripcion}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    handleImageError(e);
                                    setImgError(true);
                                }}
                            />
                        ) : (
                            <Package className="size-8 text-zinc-400" />
                        )}
                    </div>
                    <div className="flex flex-col justify-between py-0.5 min-w-0 flex-1 gap-1">
                        <div>
                            <span className="inline-block bg-zinc-100 text-zinc-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                                {formatCode(producto.codigo)}
                            </span>
                            <p className="text-xs text-zinc-700 font-medium leading-tight truncate mt-1">
                                {producto.descripcion}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] pt-1">
                            <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md font-medium">
                                <Archive className="size-3 text-zinc-500" />
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
                    <label className="block text-xs font-semibold text-zinc-600">
                        Tipo de venta en color
                    </label>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={tipoColor === 'SURTIDO'}
                                onChange={() => setTipoColor('SURTIDO')}
                                className="size-4 rounded accent-brand-primary cursor-pointer"
                            />
                            Surtido
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={tipoColor === 'ESPECIFICO'}
                                onChange={() => setTipoColor('ESPECIFICO')}
                                className="size-4 rounded accent-brand-primary cursor-pointer"
                            />
                            Color específico
                        </label>
                    </div>
                </div>

                {/* Selección y Validación de Color Específico */}
                {tipoColor === 'ESPECIFICO' && (
                    <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-3">
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
                                className="w-full h-11 rounded-xl"
                            />
                            <Input
                                label="Estado de stock"
                                variant="modal"
                                readOnly
                                value={`${stockColorSeleccionado} un.`}
                                error={sinStock ? 'Sin stock disponible para el color seleccionado.' : undefined}
                                className={`h-11 font-semibold ${!sinStock ? '!bg-zinc-50' : ''}`}
                            />
                        </div>
                    </div>
                )}

                {/* Tipo de Venta y Cantidad */}
                <div className="grid grid-cols-2 gap-3">
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
                        className="w-full h-11 rounded-xl"
                    />
                    <Input
                        label="Cantidad"
                        variant="modal"
                        type="number"
                        min={1}
                        value={cantidad}
                        onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                        className="h-11 font-semibold"
                    />
                </div>

                {/* Precio y Subtotal */}
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="Precio"
                        variant="modal"
                        type="number"
                        step="0.01"
                        icon={<span className="text-[11px] font-semibold">S/</span>}
                        value={precioInput}
                        onChange={(e) => setPrecioInput(e.target.value)}
                        className="h-11 font-semibold"
                    />
                    <Input
                        label="Subtotal"
                        variant="modal"
                        readOnly
                        icon={<span className="text-[11px] font-semibold">S/</span>}
                        value={subtotal.toFixed(2)}
                        className="h-11 !bg-zinc-50 font-bold"
                    />
                </div>

                {/* Escala de Precios Dinámica (Distribuidor vs. Tienda) */}
                <div
                    className={`w-full rounded-2xl border p-3 transition-colors ${esTienda
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                        : 'bg-[#FAF3F0] border-[#E8D8CE] text-[#A13A17]'
                        }`}
                >
                    <span className="text-center text-[11px] font-extrabold uppercase tracking-wide block mb-2">
                        {tituloEscala}
                    </span>
                    <div className="grid grid-cols-3 divide-x divide-current/20 text-center">
                        <div className="px-2">
                            <span className="block text-[10px] font-bold uppercase opacity-75">
                                UNIDAD
                            </span>
                            <span className="text-xs font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.unidad || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="px-2">
                            <span className="block text-[10px] font-bold uppercase opacity-75">
                                DOCENA
                            </span>
                            <span className="text-xs font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.docena || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="px-2">
                            <span className="block text-[10px] font-bold uppercase opacity-75">
                                MAYOR
                            </span>
                            <span className="text-xs font-extrabold mt-0.5 block">
                                S/ {Number(preciosDisplay.mayor || 0).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end items-center gap-3 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        disabled={sinStock}
                        onClick={handleGuardar}
                        className={`px-8 py-2.5 text-sm font-bold rounded-xl shadow-none transition-colors ${sinStock
                            ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                            : 'bg-brand-primary hover:bg-brand-hover text-white'
                            }`}
                    >
                        Guardar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
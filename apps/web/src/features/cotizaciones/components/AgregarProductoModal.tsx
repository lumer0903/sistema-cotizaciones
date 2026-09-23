'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Package, Archive, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { ProductoCarrito } from '../types/cotizacion';
import { Select } from '@/components/ui/Select';
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

    // Extracción segura de los 6 precios (tienda + distribuidor) desde cualquier forma del producto
    const { tienda, distribuidor } = useMemo(
        () => obtenerPreciosEstandarizados(producto),
        [producto]
    );

    const esTienda = String(tipoPrecioCliente).toUpperCase() === 'TIENDA';
    const preciosPorCliente = esTienda ? tienda : distribuidor;

    // Sincroniza el input de precio al abrir el modal / cambiar producto o tipo de cliente
    useEffect(() => {
        if (isOpen && producto) {
            setTipoColor('SURTIDO');
            setColorSeleccionado('');
            setTipoVenta('MAYOR');
            setCantidad(1);
            const inicial = esTienda ? tienda.mayor : distribuidor.mayor;
            setPrecioInput(Number(inicial || 0).toFixed(2));
            setImgError(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, producto, tipoPrecioCliente]);

    const precioNum = useMemo(() => {
        const val = parseFloat(precioInput);
        return isNaN(val) ? 0 : val;
    }, [precioInput]);

    const subtotal = useMemo(() => precioNum * cantidad, [precioNum, cantidad]);

    // Cálculo y fallback de stocks
    const stockTotalDisplay = producto?.stock_total ?? producto?.stockTotal ?? producto?.stock ?? 0;

    const stockColorSeleccionado = useMemo(() => {
        if (tipoColor === 'SURTIDO') return stockTotalDisplay;
        if (!colorSeleccionado || !producto?.coloresDisponibles) return stockTotalDisplay;

        const encontrado = producto.coloresDisponibles.find((c) => c.nombre === colorSeleccionado);
        return encontrado ? encontrado.stock : 0;
    }, [tipoColor, colorSeleccionado, producto?.coloresDisponibles, stockTotalDisplay]);

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
                            <img
                                src={getImageUrl(producto.foto_url || producto.imagenUrl)}
                                alt={producto.descripcion}
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
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-500 font-bold px-2 py-0.5 rounded-md">
                                <Package className="size-3" />
                                {stockAlertaDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-md">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {stockTotalDisplay}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tipo de Venta por Color */}
                <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-600">
                        Tipo de venta en color
                    </label>
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setTipoColor('SURTIDO')}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none"
                        >
                            {tipoColor === 'SURTIDO' ? (
                                <CheckSquare className="size-4 text-zinc-700" />
                            ) : (
                                <Square className="size-4 text-zinc-300" />
                            )}
                            Surtido
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipoColor('ESPECIFICO')}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer select-none"
                        >
                            {tipoColor === 'ESPECIFICO' ? (
                                <CheckSquare className="size-4 text-zinc-700" />
                            ) : (
                                <Square className="size-4 text-zinc-300" />
                            )}
                            Color específico
                        </button>
                    </div>
                </div>

                {/* Selección y Validación de Color Específico */}
                {tipoColor === 'ESPECIFICO' && (
                    <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                                    Seleccionar color
                                </label>
                                <Select
                                    value={colorSeleccionado}
                                    onChange={(e) => setColorSeleccionado(String(e.target.value))}
                                    options={[
                                        { label: 'Seleccionar', value: '' },
                                        ...(producto.coloresDisponibles?.map((c) => ({ label: c.nombre, value: c.nombre })) ||
                                            producto.colores_surtido?.map((c) => ({ label: c, value: c })) || []),
                                    ]}
                                    className="w-full h-11 rounded-xl border-amber-400 focus:ring-amber-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-600 mb-1">
                                    Estado de stock
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value={`${stockColorSeleccionado} un.`}
                                    className={`w-full h-11 border rounded-xl px-3 text-xs font-semibold focus:outline-none ${sinStock
                                        ? 'border-red-300 bg-red-50 text-red-600'
                                        : 'border-zinc-200 bg-zinc-50 text-zinc-700'
                                        }`}
                                />
                            </div>
                        </div>

                        {sinStock && (
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500 pt-0.5">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                Sin stock disponible para el color seleccionado.
                            </p>
                        )}
                    </div>
                )}

                {/* Tipo de Venta y Cantidad */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Tipo de venta
                        </label>
                        <Select
                            value={tipoVenta}
                            onChange={(e) => handleTipoVentaChange(String(e.target.value) as any)}
                            options={[
                                { label: 'Seleccionar', value: '' },
                                { label: 'Unidad', value: 'UNIDAD' },
                                { label: 'Docena', value: 'DOCENA' },
                                { label: 'Por Mayor', value: 'MAYOR' },
                            ]}
                            className="w-full h-11 rounded-xl border-amber-400 focus:ring-amber-400"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Cantidad
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={cantidad}
                            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                            className="w-full h-11 border border-zinc-200 rounded-xl px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:border-amber-400"
                        />
                    </div>
                </div>

                {/* Precio y Subtotal */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Precio
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-xs font-semibold text-zinc-400">
                                S/
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                value={precioInput}
                                onChange={(e) => setPrecioInput(e.target.value)}
                                className="w-full h-11 border border-zinc-200 rounded-xl pl-9 pr-3 text-xs text-zinc-800 font-semibold focus:outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Subtotal
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-xs font-semibold text-zinc-400">
                                S/
                            </span>
                            <input
                                type="text"
                                readOnly
                                value={subtotal.toFixed(2)}
                                className="w-full h-11 border border-zinc-100 bg-zinc-50/80 rounded-xl pl-9 pr-3 text-xs text-zinc-800 font-bold focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Escala de Precios */}
                <div className="border border-zinc-200 rounded-2xl p-3 text-center bg-white">
                    <span className="text-[11px] font-extrabold text-zinc-800 tracking-wide uppercase block mb-2">
                        {tituloEscala}
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <span className="block text-[10px] font-bold text-zinc-500 uppercase">
                                UNIDAD
                            </span>
                            <span className="text-xs font-extrabold text-zinc-800">
                                S/ {Number(preciosDisplay.unidad || 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="border-x border-zinc-200">
                            <span className="block text-[10px] font-bold text-zinc-500 uppercase">
                                DOCENA
                            </span>
                            <span className="text-xs font-extrabold text-zinc-800">
                                S/ {Number(preciosDisplay.docena || 0).toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-zinc-500 uppercase">
                                MAYOR
                            </span>
                            <span className="text-xs font-extrabold text-zinc-800">
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
                            : 'bg-amber-400 hover:bg-amber-500 text-amber-950'
                            }`}
                    >
                        Guardar
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
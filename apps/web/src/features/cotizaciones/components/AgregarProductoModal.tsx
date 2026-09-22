'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Package, Archive, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { ProductoCarrito } from '../types/cotizacion';

export interface ColorDisponible {
    nombre: string;
    stock: number;
}

export interface ProductoBase {
    id?: string | number;
    codigo: string;
    descripcion: string;
    imagenUrl?: string;
    estante?: string;
    stockAlerta?: number;
    stockTotal?: number;
    stock?: number;
    coloresDisponibles?: ColorDisponible[];
    precios?: {
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
    // 1. Declaración de Estados
    const [tipoColor, setTipoColor] = useState<'SURTIDO' | 'ESPECIFICO'>('SURTIDO');
    const [colorSeleccionado, setColorSeleccionado] = useState<string>('');
    const [tipoVenta, setTipoVenta] = useState<'UNIDAD' | 'DOCENA' | 'MAYOR' | ''>('');
    const [cantidad, setCantidad] = useState<number>(1);
    const [precioInput, setPrecioInput] = useState<string>('0.00');

    // 2. Obtención de escala de precios
    const preciosEscala = useMemo(() => {
        if (!producto) return { unidad: 0, docena: 0, mayor: 0 };

        const p = producto as unknown as Record<string, any>;
        const esTienda = String(tipoPrecioCliente).toUpperCase() === 'TIENDA';

        const preciosGroup = esTienda ? p.precios?.tienda : p.precios?.distribuidor;
        if (preciosGroup) {
            return {
                unidad: Number(preciosGroup.unidad ?? 0),
                docena: Number(preciosGroup.docena ?? 0),
                mayor: Number(preciosGroup.mayor ?? 0),
            };
        }

        const buscarPrecio = (...keys: string[]) => {
            for (const k of keys) {
                if (p[k] !== undefined && p[k] !== null && p[k] !== '') {
                    const val = Number(p[k]);
                    if (!isNaN(val) && val > 0) return val;
                }
            }
            return 0;
        };

        if (esTienda) {
            return {
                unidad: buscarPrecio('precioTiendaUnidad', 'precio_tienda_unidad', 'precioTienda', 'precioUnidad'),
                docena: buscarPrecio('precioTiendaDocena', 'precio_tienda_docena', 'precioDocena'),
                mayor: buscarPrecio('precioTiendaMayor', 'precio_tienda_mayor', 'precioMayor'),
            };
        }

        return {
            unidad: buscarPrecio('precioDistribuidorUnidad', 'precio_distribuidor_unidad', 'precioDistribuidor', 'precioUnidad'),
            docena: buscarPrecio('precioDistribuidorDocena', 'precio_distribuidor_docena', 'precioDocena', 'precio'),
            mayor: buscarPrecio('precioDistribuidorMayor', 'precio_distribuidor_mayor', 'precioMayor'),
        };
    }, [producto, tipoPrecioCliente]);

    // 3. Efectos
    useEffect(() => {
        if (isOpen && producto) {
            setTipoColor('SURTIDO');
            setColorSeleccionado('');
            setTipoVenta('MAYOR');
            setCantidad(1);
            setPrecioInput(preciosEscala.mayor.toFixed(2));
        }
    }, [isOpen, producto, preciosEscala]);

    // 4. Cálculos memorizados (Todos antes de cualquier 'return' condicional)
    const precioNum = useMemo(() => {
        const val = parseFloat(precioInput);
        return isNaN(val) ? 0 : val;
    }, [precioInput]);

    const subtotal = useMemo(() => precioNum * cantidad, [precioNum, cantidad]);

    const stockTotalDisplay = producto?.stockTotal ?? producto?.stock ?? 1000;

    const stockColorSeleccionado = useMemo(() => {
        if (!colorSeleccionado || !producto?.coloresDisponibles) return stockTotalDisplay;
        const encontrado = producto.coloresDisponibles.find((c) => c.nombre === colorSeleccionado);
        return encontrado ? encontrado.stock : 0;
    }, [colorSeleccionado, producto?.coloresDisponibles, stockTotalDisplay]);

    // 5. Retorno condicional colocado DESPUÉS de declarar todos los Hooks
    if (!isOpen || !producto) return null;

    const handleTipoVentaChange = (nuevoTipo: 'UNIDAD' | 'DOCENA' | 'MAYOR') => {
        setTipoVenta(nuevoTipo);
        if (nuevoTipo === 'UNIDAD') setPrecioInput(preciosEscala.unidad.toFixed(2));
        if (nuevoTipo === 'DOCENA') setPrecioInput(preciosEscala.docena.toFixed(2));
        if (nuevoTipo === 'MAYOR') setPrecioInput(preciosEscala.mayor.toFixed(2));
    };

    const handleGuardar = () => {
        onAgregar({
            id: Date.now().toString(),
            codigo: producto.codigo,
            descripcion: `${producto.descripcion}${colorSeleccionado ? ` (${colorSeleccionado})` : ''}`,
            precioUnitario: precioNum,
            cantidad,
            total: subtotal,
        });
        onClose();
    };

    const stockAlertaDisplay = producto.stockAlerta ?? 20;
    const estanteDisplay = producto.estante || 'Estante B';
    const tituloEscala = String(tipoPrecioCliente).toUpperCase() === 'TIENDA' ? 'PRECIO TIENDA' : 'PRECIO DISTRIBUIDOR';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-[420px] p-6 relative space-y-4">
                {/* Encabezado */}
                <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-zinc-800">Agregar Producto</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Ficha de producto */}
                <div className="border border-brand-primary/60 rounded-2xl p-3 flex gap-3 bg-white">
                    <div className="size-20 rounded-xl border border-brand-primary/60 flex items-center justify-center overflow-hidden bg-brand-selection shrink-0">
                        {producto.imagenUrl ? (
                            <img
                                src={producto.imagenUrl}
                                alt={producto.descripcion}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Package className="size-10 text-brand-primary" />
                        )}
                    </div>
                    <div className="flex flex-col justify-between py-0.5 min-w-0">
                        <div>
                            <span className="inline-block bg-zinc-200/80 text-zinc-700 text-[11px] font-bold px-2 py-0.5 rounded">
                                {producto.codigo}
                            </span>
                            <p className="text-xs text-zinc-800 font-medium leading-tight truncate mt-1">
                                {producto.descripcion}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] pt-1">
                            <span className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200/80 text-zinc-500 px-2 py-0.5 rounded">
                                <Archive className="size-3" />
                                {estanteDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200/60 text-red-500 font-semibold px-1.5 py-0.5 rounded">
                                <Package className="size-3" />
                                {stockAlertaDisplay}
                            </span>
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200/60 text-emerald-600 font-semibold px-2 py-0.5 rounded">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {stockTotalDisplay}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Selección Tipo de Venta en Color */}
                <div className="space-y-2">
                    <label className="block text-xs font-medium text-zinc-600">
                        Tipo de venta en color
                    </label>
                    <div className="flex items-center gap-6">
                        <button
                            type="button"
                            onClick={() => setTipoColor('SURTIDO')}
                            className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer"
                        >
                            {tipoColor === 'SURTIDO' ? (
                                <CheckSquare className="size-4 text-brand-primary fill-brand-primary/10" />
                            ) : (
                                <Square className="size-4 text-zinc-300" />
                            )}
                            Surtido
                        </button>
                        <button
                            type="button"
                            onClick={() => setTipoColor('ESPECIFICO')}
                            className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer"
                        >
                            {tipoColor === 'ESPECIFICO' ? (
                                <CheckSquare className="size-4 text-brand-primary fill-brand-primary/10" />
                            ) : (
                                <Square className="size-4 text-zinc-300" />
                            )}
                            Color especifico
                        </button>
                    </div>
                </div>

                {/* Campos condicionales para Color Específico */}
                {tipoColor === 'ESPECIFICO' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">
                                Seleccionar color
                            </label>
                            <div className="relative">
                                <select
                                    value={colorSeleccionado}
                                    onChange={(e) => setColorSeleccionado(e.target.value)}
                                    className="w-full h-10 border border-zinc-200 rounded-xl px-3 text-xs text-zinc-800 bg-white appearance-none focus:outline-none focus:border-brand-primary"
                                >
                                    <option value="">Seleccionar</option>
                                    {producto.coloresDisponibles?.map((c, i) => (
                                        <option key={i} value={c.nombre}>
                                            {c.nombre}
                                        </option>
                                    )) || <option value="Rojo">Rojo</option>}
                                </select>
                                <ChevronDown className="size-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-600 mb-1">
                                Estado de stock
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={stockColorSeleccionado}
                                className="w-full h-10 border border-zinc-200 rounded-xl px-3 text-xs text-zinc-700 bg-zinc-50 focus:outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Tipo de Venta y Cantidad */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Tipo de venta
                        </label>
                        <div className="relative">
                            <select
                                value={tipoVenta}
                                onChange={(e) => handleTipoVentaChange(e.target.value as any)}
                                className="w-full h-10 border border-zinc-200 rounded-xl px-3 text-xs text-zinc-800 bg-white appearance-none focus:outline-none focus:border-brand-primary"
                            >
                                <option value="" disabled>
                                    Seleccionar
                                </option>
                                <option value="UNIDAD">Unidad</option>
                                <option value="DOCENA">Docena</option>
                                <option value="MAYOR">Por Mayor</option>
                            </select>
                            <ChevronDown className="size-4 text-zinc-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Cantidad
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={cantidad}
                            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                            className="w-full h-10 border border-zinc-200 rounded-xl px-3 text-xs text-zinc-800 focus:outline-none focus:border-brand-primary"
                        />
                    </div>
                </div>

                {/* Precio y Subtotal */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Precio
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs text-zinc-400 font-medium">
                                S/
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                value={precioInput}
                                onChange={(e) => setPrecioInput(e.target.value)}
                                className="w-full h-10 border border-zinc-200 rounded-xl pl-8 pr-3 text-xs text-zinc-800 font-medium focus:outline-none focus:border-brand-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-600 mb-1">
                            Subtotal
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3 text-xs text-zinc-400 font-medium">
                                S/
                            </span>
                            <input
                                type="text"
                                readOnly
                                value={subtotal.toFixed(2)}
                                className="w-full h-10 border border-zinc-100 bg-zinc-50 rounded-xl pl-8 pr-3 text-xs text-zinc-800 font-bold focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Escala de Precios */}
                <div className="bg-brand-selection/70 border border-brand-primary/40 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] font-black text-brand-subtitle tracking-wider uppercase">
                        {tituloEscala}
                    </span>
                    <div className="grid grid-cols-3 gap-2 mt-1.5 text-center">
                        <div>
                            <span className="block text-[9px] font-bold text-zinc-700 uppercase">
                                UNIDAD
                            </span>
                            <span className="text-xs font-black text-brand-subtitle">
                                S/ {preciosEscala.unidad.toFixed(2)}
                            </span>
                        </div>
                        <div className="border-x border-brand-primary/30">
                            <span className="block text-[9px] font-bold text-zinc-700 uppercase">
                                DOCENA
                            </span>
                            <span className="text-xs font-black text-brand-subtitle">
                                S/ {preciosEscala.docena.toFixed(2)}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[9px] font-bold text-zinc-700 uppercase">
                                MAYOR
                            </span>
                            <span className="text-xs font-black text-brand-subtitle">
                                S/ {preciosEscala.mayor.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-end items-center gap-4 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleGuardar}
                        className="px-8 py-2.5 text-sm font-bold bg-brand-primary hover:bg-brand-hover text-white rounded-xl shadow-sm transition-colors"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
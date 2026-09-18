'use client';

import React from 'react';
import { History } from 'lucide-react';
import { ProductoConsulta } from '../types/precio';

interface PriceCardProps {
    producto: ProductoConsulta;
    tipoPrecio?: 'distribuidor' | 'tienda' | '';
    onVerHistorial?: (id: string) => void;
}

export const PriceCard: React.FC<PriceCardProps> = ({ producto, tipoPrecio, onVerHistorial }) => {
    const tieneStock = producto.stock > 0;

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
            {/* Imagen & Botón Historial */}
            <div className="w-full h-28 bg-amber-500/10 rounded-xl relative flex items-center justify-center overflow-hidden">
                {producto.imagenUrl ? (
                    <img
                        src={producto.imagenUrl}
                        alt={producto.descripcion}
                        className="w-full h-full object-contain p-2"
                    />
                ) : (
                    <div className="text-amber-500/50 font-bold text-xs uppercase tracking-wider">Sin imagen</div>
                )}

                <button
                    onClick={() => onVerHistorial?.(producto.id)}
                    title="Ver historial de precios"
                    className="absolute top-2 right-2 p-1.5 text-amber-600 hover:text-amber-700 bg-white/80 rounded-lg backdrop-blur-sm transition-colors"
                >
                    <History className="size-4" />
                </button>
            </div>

            {/* Cabecera del producto */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-extrabold text-sm tracking-tight">
                        {producto.codigo}
                    </span>
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`size-2 rounded-full ${tieneStock ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                        <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${tieneStock ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                        >
                            STOCK: {producto.stock}
                        </span>
                    </div>
                </div>

                <p className="text-zinc-400 text-[11px] font-normal leading-tight line-clamp-2 h-7">
                    {producto.descripcion}
                </p>
            </div>

            {/* Precio Distribuidor (1 Fila de 3 columnas) */}
            {tipoPrecio !== 'tienda' && (
                <div className="bg-orange-50/80 border border-orange-200/60 rounded-xl p-2.5 flex flex-col items-center gap-1.5">
                    <span className="text-orange-900 text-[10px] font-black tracking-wider uppercase">
                        Precio Distribuidor
                    </span>
                    <div className="w-full grid grid-cols-3 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Unidad</span>
                            <span className="text-orange-900 text-xs font-black">
                                S/{producto.precioDistribuidor.unidad.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Docena</span>
                            <span className="text-orange-900 text-xs font-black">
                                S/{producto.precioDistribuidor.docena.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Mayor</span>
                            <span className="text-orange-900 text-xs font-black">
                                S/{producto.precioDistribuidor.mayor.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Precio Tienda (1 Fila de 3 columnas) */}
            {tipoPrecio !== 'distribuidor' && (
                <div className="bg-blue-50/80 border border-blue-200/60 rounded-xl p-2.5 flex flex-col items-center gap-1.5">
                    <span className="text-blue-900 text-[10px] font-black tracking-wider uppercase">
                        Precio Tienda
                    </span>
                    <div className="w-full grid grid-cols-3 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Unidad</span>
                            <span className="text-blue-900 text-xs font-black">
                                S/{producto.precioTienda.unidad.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Docena</span>
                            <span className="text-blue-900 text-xs font-black">
                                S/{producto.precioTienda.docena.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-zinc-500 text-[9px] font-bold uppercase">Mayor</span>
                            <span className="text-blue-900 text-xs font-black">
                                S/{producto.precioTienda.mayor.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
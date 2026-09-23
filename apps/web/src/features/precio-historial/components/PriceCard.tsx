import React from 'react';
import { History } from 'lucide-react';
import { ProductoConsulta } from '../types/precio';
import { getImageUrl, handleImageError } from '@/lib/imageUtils';
import { formatPrice, formatCode, obtenerPreciosEstandarizados } from '@/lib/formatters';

interface PriceCardProps {
    producto: ProductoConsulta;
    tipoPrecio?: 'distribuidor' | 'tienda' | '';
    onVerHistorial?: (id: string) => void;
}

export const PriceCard: React.FC<PriceCardProps> = ({ producto, tipoPrecio, onVerHistorial }) => {
    const tieneStock = (producto?.stock ?? 0) > 0;
    // Extracción segura: soporta forma procesada (precioTienda/precioDistribuidor) y raw (precios_actuales/precios)
    const { tienda, distribuidor } = obtenerPreciosEstandarizados(producto);

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
            {/* Imagen & Botón Historial */}
            <div className="w-full h-28 bg-brand-primary/10 rounded-xl relative flex items-center justify-center overflow-hidden">
                {producto.imagenUrl ? (
                    <img
                        src={producto.imagenUrl}
                        alt={producto.descripcion}
                        className="w-full h-full object-cover object-center"
                        onError={(e) => handleImageError(e, '200')}
                    />
                ) : (
                    <div className="text-brand-primary/50 font-bold text-xs uppercase tracking-wider">Sin imagen</div>
                )}

                <button
                    type="button"
                    onClick={() => onVerHistorial?.(producto.id)}
                    title="Ver historial de precios"
                    className="absolute top-2 right-2 p-1.5 text-brand-primary hover:text-brand-hover bg-white/80 rounded-lg backdrop-blur-sm transition-colors z-10"
                >
                    <History className="size-4" />
                </button>
            </div>

            {/* Cabecera del producto */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="text-brand-primary font-extrabold text-sm tracking-tight uppercase">
                        {formatCode(producto.codigo)}
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
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 flex flex-col items-center gap-1.5">
                    <span className="text-orange-700 text-[10px] font-black tracking-wider uppercase">
                        Precio Distribuidor
                    </span>
                    <div className="w-full grid grid-cols-3 text-center">
                        <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Unidad</span>
                            <span className="text-orange-900 text-xs font-black">
                                {formatPrice(distribuidor.unidad)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Docena</span>
                            <span className="text-orange-900 text-xs font-black">
                                {formatPrice(distribuidor.docena)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Mayor</span>
                            <span className="text-orange-900 text-xs font-black">
                                {formatPrice(distribuidor.mayor)}
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
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Unidad</span>
                            <span className="text-blue-900 text-xs font-black">
                                {formatPrice(tienda.unidad)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Docena</span>
                            <span className="text-blue-900 text-xs font-black">
                                {formatPrice(tienda.docena)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-gray-400 text-[9px] font-bold uppercase">Mayor</span>
                            <span className="text-blue-900 text-xs font-black">
                                {formatPrice(tienda.mayor)}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
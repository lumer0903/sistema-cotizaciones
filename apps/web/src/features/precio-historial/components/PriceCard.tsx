import Image from 'next/image';
import React from 'react';
import { History } from 'lucide-react';
import { ProductoConsulta } from '../types/precio';
import { handleImageError } from '@/lib/imageUtils';
import { formatCode } from '@/lib/formatters';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

interface PriceCardProps {
    producto: ProductoConsulta;
    tipoPrecio?: 'distribuidor' | 'tienda' | '';
    onVerHistorial?: (id: string) => void;
}

export const PriceCard: React.FC<PriceCardProps> = ({ producto, tipoPrecio, onVerHistorial }) => {
    const tieneStock = (producto?.stock ?? 0) > 0;
    // Extracción segura: soporta forma procesada (precioTienda/precioDistribuidor) y raw (precios_actuales/precios)
    const { tienda, distribuidor } = {tienda:producto.precioTienda,distribuidor:producto.precioDistribuidor};

    const renderPrecioItem = (
        label: string,
        valor: number | string | undefined | null,
        tipo: 'distribuidor' | 'tienda'
    ) => {
        const num = typeof valor === 'string' ? parseFloat(valor) : valor;
        const isValid = num !== null && num !== undefined && Number.isFinite(num);
        const amountStr = isValid
            ? num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—';
        const fullText = `S/ ${amountStr}`;

        const isDist = tipo === 'distribuidor';
        const textColor = isDist ? 'text-role-distribuidor' : 'text-role-tienda';
        const borderColor = isDist ? 'border-role-distribuidor/25' : 'border-role-tienda/25';
        const bgItem = isDist ? 'bg-surface/90 hover:bg-surface' : 'bg-surface/90 hover:bg-surface';

        return (
            <div className={cn(
                'flex items-center justify-between gap-2 py-1 px-2 rounded-md border min-w-0 transition-colors',
                borderColor,
                bgItem
            )}>
                <span className="text-[10px] font-semibold text-brand-options uppercase shrink-0">
                    {label}
                </span>
                <div
                    className="flex items-baseline justify-end gap-0.5 min-w-0"
                    title={fullText}
                >
                    <span className={cn('text-[10px] font-bold opacity-75 shrink-0 select-none', textColor)}>
                        S/
                    </span>
                    <span className={cn('text-[11px] font-semibold tabular-nums whitespace-nowrap tracking-tight', textColor)}>
                        {amountStr}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            'group w-full h-full bg-surface rounded-2xl shadow-card border border-border-default/80 p-3 flex flex-col gap-2',
            'hover:shadow-card-hover hover:border-accent-primary/40 transition-all duration-200'
        )}>
            {/* Contenido superior: Imagen, Datos del producto */}
            <div className="flex flex-col gap-2 min-w-0">
                {/* Imagen & Botón Historial */}
                <div className="w-full h-28 sm:h-32 bg-surface-muted rounded-xl relative flex items-center justify-center overflow-hidden border border-border-default/40">
                    {producto.imagenUrl ? (
                        <Image
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            unoptimized
                            loading="lazy"
                            src={producto.imagenUrl}
                            alt={producto.descripcion}
                            className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => handleImageError(e, '200')}
                        />
                    ) : (
                        <div className="text-brand-options/50 font-bold text-xs uppercase tracking-wider">
                            Sin imagen
                        </div>
                    )}

                    {/* Historial de variaciones: sólo admin/gerente (no se pasa la callback). */}
                    {onVerHistorial && (
                        <Button
                            variant="ghost"
                            onClick={() => onVerHistorial(producto.id)}
                            title="Ver historial de precios"
                            aria-label={`Ver historial de precios de ${producto.codigo}`}
                            className="absolute top-2 right-2 size-8 p-0 rounded-lg bg-surface/90 hover:bg-surface text-brand-subtitle hover:text-accent-ink border border-border-default/60 shadow-xs backdrop-blur-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center z-10"
                        >
                            <History className="size-4" />
                        </Button>
                    )}
                </div>

                {/* Cabecera del producto */}
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-accent-ink font-bold text-sm tracking-tight uppercase truncate" title={formatCode(producto.codigo)}>
                            {formatCode(producto.codigo)}
                        </span>
                        <div
                            className={cn(
                                'flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
                                tieneStock
                                    ? 'bg-status-aprobado-soft text-status-aprobado-text border-status-aprobado/20'
                                    : 'bg-status-rechazado-soft text-status-rechazado-text border-status-rechazado/20'
                            )}
                        >
                            <span
                                className={cn(
                                    'size-1.5 rounded-full',
                                    tieneStock ? 'bg-status-aprobado' : 'bg-status-rechazado'
                                )}
                            />
                            <span>STOCK: {producto.stock}</span>
                        </div>
                    </div>

                    <p className="text-brand-options text-xs font-normal leading-snug line-clamp-2 h-8 min-h-[2rem]" title={producto.descripcion}>
                        {producto.descripcion}
                    </p>
                </div>
            </div>

            {/* Contenido inferior: Bloques de Precios */}
            <div className="flex flex-col gap-2.5 w-full">
                {/* Precio Distribuidor (1 Fila de 3 columnas) */}
                {tipoPrecio !== 'tienda' && (
                    <div className="bg-role-distribuidor-soft/60 border border-role-distribuidor/25 rounded-lg p-2 w-full flex flex-col gap-1.5">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-role-distribuidor text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-role-distribuidor" />
                                Precio Distribuidor
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 w-full">
                            {renderPrecioItem('Unidad', distribuidor.unidad, 'distribuidor')}
                            {renderPrecioItem('Docena', distribuidor.docena, 'distribuidor')}
                            {renderPrecioItem('Mayor', distribuidor.mayor, 'distribuidor')}
                        </div>
                    </div>
                )}

                {/* Precio Tienda (1 Fila de 3 columnas) */}
                {tipoPrecio !== 'distribuidor' && (
                    <div className="bg-role-tienda-soft/60 border border-role-tienda/25 rounded-lg p-2 w-full flex flex-col gap-1.5">
                        <div className="flex items-center justify-between px-0.5">
                            <span className="text-role-tienda text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-role-tienda" />
                                Precio Tienda
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-1 w-full">
                            {renderPrecioItem('Unidad', tienda.unidad, 'tienda')}
                            {renderPrecioItem('Docena', tienda.docena, 'tienda')}
                            {renderPrecioItem('Mayor', tienda.mayor, 'tienda')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

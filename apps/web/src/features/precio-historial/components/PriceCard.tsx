import Image from 'next/image';
import React from 'react';
import { History, Package } from 'lucide-react';
import type { ProductoConsulta } from '../types/precio';
import { handleImageError } from '@/lib/imageUtils';
import { formatCode } from '@/lib/formatters';

interface PriceCardProps {
  producto: ProductoConsulta;
  tipoPrecio?: 'distribuidor' | 'tienda' | '';
  onVerHistorial?: (id: string) => void;
}

const formatAmount = (valor: number | string | undefined | null) => {
  const num = typeof valor === 'string' ? parseFloat(valor) : valor;
  const isValid = num !== null && num !== undefined && Number.isFinite(num);
  return isValid
    ? `S/ ${num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
};

export const PriceCard: React.FC<PriceCardProps> = ({
  producto,
  tipoPrecio,
  onVerHistorial,
}) => {
  const tieneStock = (producto?.stock ?? 0) > 0;
  const distribuidor = producto.precioDistribuidor;
  const tienda = producto.precioTienda;

  return (
    <div className="w-full bg-white rounded-lg shadow-[3px_3px_10px_0px_rgba(0,0,0,0.25)] p-3 flex flex-col gap-2.5 overflow-hidden transition-transform hover:-translate-y-0.5">
      {/* Bloque superior: Imagen / Placeholder + Acción rápida */}
      <div className="relative w-full h-28 bg-[#F8B602]/20 rounded-lg flex items-center justify-center overflow-hidden">
        {producto.imagenUrl ? (
          <Image
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
            unoptimized
            loading="lazy"
            src={producto.imagenUrl}
            alt={producto.descripcion}
            className="w-full h-full object-cover"
            onError={(e) => handleImageError(e, '200')}
          />
        ) : (
          <Package className="size-8 text-[#F8B602]/70" strokeWidth={1.5} />
        )}

        {onVerHistorial && (
          <button
            type="button"
            onClick={() => onVerHistorial(producto.id)}
            title="Ver historial de precios"
            aria-label={`Ver historial de precios de ${producto.codigo}`}
            className="absolute top-2 right-2 size-7 rounded-md bg-white/90 hover:bg-white text-[#F8B602] shadow-xs flex items-center justify-center transition-transform hover:scale-105 active:scale-95 focus:outline-none z-10"
          >
            <History className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Bloque de información del producto */}
      <div className="flex flex-col gap-1 min-w-0">
        {/* Fila superior: Código e indicador de stock */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <span
            className="text-xs font-black text-[#F8B602] truncate"
            title={formatCode(producto.codigo)}
          >
            {formatCode(producto.codigo)}
          </span>
          <div className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className={`size-1.5 rounded-full ${
                tieneStock ? 'bg-[#0CC200]' : 'bg-rose-500'
              }`}
            />
            <span
              className={`text-[10px] font-black uppercase tabular-nums ${
                tieneStock ? 'text-[#0CC200]' : 'text-rose-500'
              }`}
            >
              STOCK: {producto.stock}
            </span>
          </div>
        </div>

        {/* Descripción */}
        <p
          className="text-xs font-light text-[#8D8D8D] line-clamp-2 leading-snug min-h-[2rem]"
          title={producto.descripcion}
        >
          {producto.descripcion}
        </p>
      </div>

      {/* Bloque 1: PRECIO DISTRIBUIDOR */}
      {tipoPrecio !== 'tienda' && (
        <div className="w-full rounded-lg bg-[#FFF3E4] border border-[#FEDEBA] px-2.5 py-1.5 flex flex-col items-center gap-1">
          <span className="text-[9px] font-black tracking-wide text-[#9D3A19] uppercase">
            PRECIO DISTRIBUIDOR
          </span>
          <div className="w-full grid grid-cols-3 gap-1 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">UNIDAD</span>
              <span className="text-[11px] font-black text-[#9D3A19] tabular-nums">
                {formatAmount(distribuidor?.unidad)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">DOCENA</span>
              <span className="text-[11px] font-black text-[#9D3A19] tabular-nums">
                {formatAmount(distribuidor?.docena)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">MAYOR</span>
              <span className="text-[11px] font-black text-[#9D3A19] tabular-nums">
                {formatAmount(distribuidor?.mayor)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bloque 2: PRECIO TIENDA */}
      {tipoPrecio !== 'distribuidor' && (
        <div className="w-full rounded-lg bg-[#E8F2FE] border border-[#C4DEFE] px-2.5 py-1.5 flex flex-col items-center gap-1">
          <span className="text-[9px] font-black tracking-wide text-[#1F41AF] uppercase">
            PRECIO TIENDA
          </span>
          <div className="w-full grid grid-cols-3 gap-1 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">UNIDAD</span>
              <span className="text-[11px] font-black text-[#1F41AF] tabular-nums">
                {formatAmount(tienda?.unidad)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">DOCENA</span>
              <span className="text-[11px] font-black text-[#1F41AF] tabular-nums">
                {formatAmount(tienda?.docena)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-black text-black uppercase">MAYOR</span>
              <span className="text-[11px] font-black text-[#1F41AF] tabular-nums">
                {formatAmount(tienda?.mayor)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

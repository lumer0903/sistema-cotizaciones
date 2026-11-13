import Image from 'next/image';
import React from 'react';
import { History, ImageOff } from 'lucide-react';
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
     <div className="w-full bg-white rounded-xl shadow-2xs p-3 flex flex-col gap-2 overflow-hidden transition-transform hover:-translate-y-0.5">
      {/* 1. Bloque superior: Imagen / Placeholder + Acción rápida de Historial */}
      <div className="relative h-24 w-full rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
        {producto.imagenUrl ? (
          <Image
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
            loading="lazy"
            src={producto.imagenUrl}
            alt={producto.codigo}
            className="w-full h-full object-contain p-1.5"
            onError={(e) => handleImageError(e, '200')}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-slate-400 select-none">
            <ImageOff className="size-4 stroke-[1.75]" />
            <span className="text-[11px] font-medium">Sin imagen</span>
          </div>
        )}

        {onVerHistorial && (
          <button
            type="button"
            onClick={() => onVerHistorial(producto.id)}
            title="Ver historial de precios"
            aria-label={`Ver historial de precios de ${producto.codigo}`}
            className="absolute top-1.5 right-1.5 size-7 rounded-lg bg-white/95 border border-[#E5E7EB] shadow-2xs flex items-center justify-center text-[#F8B602] hover:bg-[#FFF8E6] transition-colors cursor-pointer"
          >
            <History className="size-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 2. Cabecera de datos: Código a la izquierda y Stock a la derecha (sin descripción) */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        <span
          className="text-xs font-black text-[#F8B602] truncate"
          title={formatCode(producto.codigo)}
        >
          {formatCode(producto.codigo)}
        </span>
        <div className="inline-flex items-center justify-center gap-1 shrink-0">
          <span
            className={`size-1.5 rounded-full ${
              !tieneStock || (producto.stockMinimo && producto.stock < producto.stockMinimo)
                ? 'bg-red-500 text-red-600 border border-red-200'
                : 'bg-emerald-500 text-emerald-600 border border-emerald-200'
            }`}
          />
          <span
            className={`text-[10px] font-bold uppercase tabular-nums ${
              !tieneStock || (producto.stockMinimo && producto.stock < producto.stockMinimo)
                ? 'text-red-600 font-bold'
                : 'text-emerald-600 font-bold'}
            `}
          >
            STOCK: {producto.stock}
          </span>
        </div>
      </div>

      {/* 3. Bloque(s) de precios */}
      {/* Bloque 1: PRECIO DISTRIBUIDOR */}
      {tipoPrecio !== 'tienda' && (
        <div className="w-full rounded-md bg-[#FFF3E4] border border-[#FEDEBA] px-2 py-1 flex flex-col items-center gap-0.5">
          <span className="text-[8px] font-black tracking-wide text-[#9D3A19] uppercase">
            PRECIO DISTRIBUIDOR
          </span>
          <div className="w-full grid grid-cols-3 gap-0.5 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">UNIDAD</span>
              <span className="text-[11px] font-extrabold text-[#9D3A19] tabular-nums whitespace-nowrap">
                {formatAmount(distribuidor?.unidad)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">DOCENA</span>
              <span className="text-[11px] font-extrabold text-[#9D3A19] tabular-nums whitespace-nowrap">
                {formatAmount(distribuidor?.docena)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">MAYOR</span>
              <span className="text-[11px] font-extrabold text-[#9D3A19] tabular-nums whitespace-nowrap">
                {formatAmount(distribuidor?.mayor)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bloque 2: PRECIO TIENDA */}
      {tipoPrecio !== 'distribuidor' && (
        <div className="w-full rounded-md bg-[#E8F2FE] border border-[#C4DEFE] px-2 py-1 flex flex-col items-center gap-0.5">
          <span className="text-[8px] font-black tracking-wide text-[#1F41AF] uppercase">
            PRECIO TIENDA
          </span>
          <div className="w-full grid grid-cols-3 gap-0.5 text-center">
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">UNIDAD</span>
              <span className="text-[11px] font-extrabold text-[#1F41AF] tabular-nums whitespace-nowrap">
                {formatAmount(tienda?.unidad)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">DOCENA</span>
              <span className="text-[11px] font-extrabold text-[#1F41AF] tabular-nums whitespace-nowrap">
                {formatAmount(tienda?.docena)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-bold text-black uppercase">MAYOR</span>
              <span className="text-[11px] font-extrabold text-[#1F41AF] tabular-nums whitespace-nowrap">
                {formatAmount(tienda?.mayor)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

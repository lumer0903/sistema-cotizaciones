'use client';

import React, { useState } from 'react';
import { FileText, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ResumenCotizacionCardProps {
  itemsCount: number;
  subtotal: number;
  incluyeCarreta: boolean;
  costoCarreta: number;
  igv?: number;
  total: number;
  onToggleCarreta: (checked: boolean) => void;
  onContinuar: () => void;
  continuarDisabled?: boolean;
}

function ResumenRow({
  label,
  value,
  divider = false,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`py-1.5 flex justify-between items-center ${divider ? 'border-b border-gray-100 pb-2 mb-1' : ''
        }`}
    >
      <span className="text-sm font-medium text-zinc-600 tracking-tight">
        {label}
      </span>
      <span className="text-sm font-medium text-zinc-600">
        {value}
      </span>
    </div>
  );
}

export function ResumenCotizacionCard({
  itemsCount,
  subtotal,
  incluyeCarreta,
  costoCarreta,
  igv,
  total,
  onToggleCarreta,
  onContinuar,
  continuarDisabled = false,
}: ResumenCotizacionCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-4 font-['DM_Sans'] transition-all">
      {/* Encabezado con botón de minimizar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-amber-500" strokeWidth={2.2} />
          <span className="text-lg font-black text-zinc-700 tracking-wide uppercase">
            RESUMEN
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="p-1 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          aria-label={isMinimized ? 'Expandir resumen' : 'Minimizar resumen'}
        >
          {isMinimized ? <Plus className="size-5 stroke-[2.5]" /> : <Minus className="size-5 stroke-[2.5]" />}
        </button>
      </div>

      {/* Contenido colapsable */}
      {!isMinimized && (
        <>
          {/* Desglose de Totales */}
          <div className="flex flex-col pt-1">
            <ResumenRow label={`Subtotal (${itemsCount} items)`} value={`S/ ${subtotal.toFixed(2)}`} />
            <ResumenRow label="Carreta" value={`S/ ${costoCarreta.toFixed(2)}`} />
            {igv !== undefined && (
              <ResumenRow label="IGV (18%)" value={`S/ ${igv.toFixed(2)}`} />
            )}

            <div className="border-t border-zinc-100 mt-2 pt-2 flex justify-between items-center">
              <span className="text-xl font-black text-zinc-800 tracking-tight">Total</span>
              <span className="text-xl font-black text-zinc-800">
                S/ {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Toggle de Carreta */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => onToggleCarreta(!incluyeCarreta)}
              className="flex items-center gap-2 cursor-pointer select-none group"
            >
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${incluyeCarreta ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
              >
                <div
                  className={`bg-white size-4 rounded-full shadow-md transform transition-transform duration-200 ${incluyeCarreta ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
              </div>
              <span className="text-sm font-semibold text-emerald-600">
                Carreta
              </span>
            </button>
            <p className="text-[10px] text-zinc-400 font-light pl-0.5">
              *Carreta precio aproximado S/15
            </p>
          </div>

          {/* Botón Continuar */}
          <div className="flex justify-end pt-2">
            <Button
              variant="primary"
              disabled={continuarDisabled}
              onClick={onContinuar}
              className={`px-6 py-2.5 !rounded-xl text-sm font-bold transition-all ${continuarDisabled
                ? '!bg-zinc-400 !text-white cursor-not-allowed opacity-90'
                : '!bg-zinc-500 hover:!bg-zinc-600 !text-white'
                }`}
            >
              Continuar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
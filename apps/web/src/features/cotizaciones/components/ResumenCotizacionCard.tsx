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
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-6 space-y-5 font-['DM_Sans'] transition-all">
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
          className="min-h-11 min-w-11 -mr-2 inline-flex items-center justify-center text-amber-700 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
          aria-label={isMinimized ? 'Expandir resumen' : 'Minimizar resumen'}
          aria-expanded={!isMinimized}
        >
          {isMinimized ? <Plus className="size-5 stroke-[2.5]" /> : <Minus className="size-5 stroke-[2.5]" />}
        </button>
      </div>

      {/* Contenido colapsable */}
      {!isMinimized && (
        <>
          {/* Desglose de Totales */}
          <div className="flex flex-col">
            <ResumenRow label={`Subtotal (${itemsCount} items)`} value={`S/ ${subtotal.toFixed(2)}`} />
            <ResumenRow label="Carreta" value={`S/ ${costoCarreta.toFixed(2)}`} />
            {igv !== undefined && (
              <ResumenRow label="IGV (18%)" value={`S/ ${igv.toFixed(2)}`} />
            )}

            <div className="border-t border-zinc-200 mt-3 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total</span>
              <span className="text-xl font-bold text-brand-ink">
                S/ {total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Toggle de Carreta */}
          <div className="pt-1 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => onToggleCarreta(!incluyeCarreta)}
              className="w-full flex items-center justify-between gap-2 cursor-pointer select-none group py-1"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-9 h-5 inline-flex items-center rounded-full p-0.5 transition-colors duration-200 ${incluyeCarreta ? 'bg-emerald-500' : 'bg-zinc-300'
                    }`}
                >
                  <span
                    className={`bg-white size-4 rounded-full shadow-md transform transition-transform duration-200 ${incluyeCarreta ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </span>
                <span className="text-sm font-semibold text-zinc-700">Carreta</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums transition-colors ${incluyeCarreta
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-500'
                  }`}
              >
                {incluyeCarreta ? '+ S/ 15.00' : 'S/ 0.00'}
              </span>
            </button>
            <p className="text-xs text-zinc-500 font-light pl-0.5 mt-1">
              *Carreta precio aproximado S/15
            </p>
          </div>

          {/* Botón Continuar */}
          <div className="flex justify-end pt-2">
            <Button
              variant={continuarDisabled ? 'ghost' : 'primary'}
              disabled={continuarDisabled}
              onClick={onContinuar}
              className="min-h-11 px-6 !rounded-xl text-sm font-bold transition-all"
            >
              Continuar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
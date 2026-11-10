'use client';
import { Card } from '@/components/ui/Card';

import React, { useState } from 'react';
import { FileText, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ResumenCotizacionCardProps {
  itemsCount: number;
  subtotal: number;
  incluyeCarreta: boolean;
  igv?: number;
  total: number;
  onToggleCarreta: (checked: boolean) => void;
  onContinuar: () => void;
  continuarDisabled?: boolean;
}

export function ResumenCotizacionCard({
  itemsCount,
  subtotal,
  incluyeCarreta,
  igv,
  total,
  onToggleCarreta,
  onContinuar,
  continuarDisabled = false,
}: ResumenCotizacionCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <Card className="p-6 space-y-5 font-sans transition-[box-shadow] duration-150 overflow-visible">
      {/* Encabezado con botón de minimizar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-accent-ink" strokeWidth={2.2} />
          <span className="text-lg font-black text-zinc-700 tracking-wide">
            Resumen
          </span>
        </div>

        <Button
          variant="ghost"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="min-h-11 min-w-11 -mr-2 p-0 text-accent-ink hover:text-accent-ink hover:bg-accent-soft"
          aria-label={isMinimized ? 'Expandir resumen' : 'Minimizar resumen'}
          aria-expanded={!isMinimized}
        >
          {isMinimized ? <Plus className="size-5 stroke-[2.5]" /> : <Minus className="size-5 stroke-[2.5]" />}
        </Button>
      </div>

      {/* Contenido colapsable */}
      {!isMinimized && (
        <>
          {/* Desglose de Totales en 2 renglones + Total con acción primaria */}
          <div className="flex flex-col space-y-3">
            {/* Renglón secundario: Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-zinc-600 tracking-tight">Subtotal ({itemsCount} items)</span>
              <span className="text-sm font-medium text-zinc-600">S/ {subtotal.toFixed(2)}</span>
            </div>

            {/* Renglón terciario: Carreta + IGV agrupados */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`w-9 h-5 inline-flex items-center rounded-full p-0.5 transition-colors duration-200 ${incluyeCarreta ? 'bg-brand-primary' : 'bg-zinc-300'
                    }`}
                >
                  <span
                    className={`bg-surface size-4 rounded-full shadow-md transform transition-transform duration-200 ${incluyeCarreta ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </span>
                <span className="text-sm font-semibold text-zinc-700">Carreta</span>
              </div>
              {igv !== undefined && (
                <span className="text-sm font-medium text-zinc-600">IGV (18%) S/ {igv.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Total con botón acción primaria en misma línea */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-brand-options">Total</span>
            <span className="text-xl font-bold text-accent-ink">S/ {total.toFixed(2)}</span>
          </div>

          {/* Toggle de Carreta */}
          <div className="pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={() => onToggleCarreta(!incluyeCarreta)}
              className="w-full flex items-center justify-between gap-2 cursor-pointer select-none group py-1"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-9 h-5 inline-flex items-center rounded-full p-0.5 transition-colors duration-200 ${incluyeCarreta ? 'bg-brand-primary' : 'bg-zinc-300'
                    }`}
                >
                  <span
                    className={`bg-surface size-4 rounded-full shadow-md transform transition-transform duration-200 ${incluyeCarreta ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </span>
                <span className="text-sm font-semibold text-zinc-700">Carreta</span>
              </span>
              <span
                className={`text-sm font-bold px-2 py-0.5 rounded-full tabular-nums transition-colors ${incluyeCarreta
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-zinc-100 text-brand-options'
                  }`}
              >
                {incluyeCarreta ? '+ S/ 15.00' : 'S/ 0.00'}
              </span>
            </button>
            <p className="text-sm text-brand-options font-light pl-0.5 mt-1">
              *Carreta precio aproximado S/15
            </p>
          </div>

          {/* Botón Continuar - acción primaria */}
          <div className="flex justify-end pt-2">
            <Button
              variant={continuarDisabled ? 'ghost' : 'primary'}
              disabled={continuarDisabled}
              onClick={onContinuar}
              className="min-h-11 px-6 !rounded-xl text-sm font-bold transition-[background-color,color,transform] active:scale-[0.96]"
            >
              Continúa
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface StockBadgeProps {
  /** Cantidad disponible. */
  stock: number;
  /** Stock mínimo configurado para el producto. */
  minimo?: number;
  className?: string;
}

/**
 * Indicador de stock semántico con pill de borde y contraste:
 *  - 0 unidades / crítico → rojo suave `bg-red-50 text-red-700 border border-red-200`
 *  - bajo el mínimo       → ámbar  `bg-amber-50 text-amber-700 border border-amber-200`
 *  - en el mínimo        → ámbar  `bg-amber-50 text-amber-700 border border-amber-200`
 *  - sobre el mínimo     → verde  `bg-emerald-50 text-emerald-700 border border-emerald-200`
 */
export function StockBadge({ stock, minimo = 0, className }: StockBadgeProps) {
  const state =
    stock <= 0 ? 'critico' : stock < minimo ? 'bajo' : stock === minimo ? 'minimo' : 'ok';

  const styles: Record<typeof state, string> = {
    critico: 'bg-red-50 text-red-700 border border-red-200',
    bajo: 'bg-amber-50 text-amber-700 border border-amber-200',
    minimo: 'bg-amber-50 text-amber-700 border border-amber-200',
    ok: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  const labels: Record<typeof state, string> = {
    critico: 'Sin stock',
    bajo: 'Bajo el mínimo',
    minimo: 'En el mínimo',
    ok: 'Disponible',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[2.25rem] h-6 px-2 rounded-full text-xs font-bold tabular-nums',
        styles[state],
        className
      )}
      title={`${labels[state]} — stock ${stock}${minimo > 0 ? `, mínimo ${minimo}` : ''}`}
    >
      {stock}
      <span className="sr-only"> ({labels[state]})</span>
    </span>
  );
}

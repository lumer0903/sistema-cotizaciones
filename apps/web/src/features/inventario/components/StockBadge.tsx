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
 * Indicador de stock semántico:
 *  - 0 unidades      → crítico
 *  - bajo el mínimo  → advertencia
 *  - sobre el mínimo → OK
 * El color comunica el estado real (nunca "verde" por defecto).
 */
export function StockBadge({ stock, minimo = 0, className }: StockBadgeProps) {
  const state =
    stock <= 0 ? 'critico' : stock < minimo ? 'bajo' : stock === minimo ? 'minimo' : 'ok';

  const styles: Record<typeof state, string> = {
    critico: 'bg-status-rechazado-soft text-status-rechazado-text border-status-rechazado/40',
    bajo: 'bg-status-advertencia-soft text-status-advertencia-text border-amber-500/40',
    minimo: 'bg-status-advertencia-soft text-status-advertencia-text border-amber-500/40',
    ok: 'bg-status-aprobado-soft text-status-aprobado-text border-status-aprobado/40',
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
        'inline-flex items-center justify-center min-w-10 px-2 py-1 rounded-full border text-sm font-bold tnum',
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

'use client';

import React from 'react';
import { Button } from '@/components/ui';

export interface SurtidoColorsFieldProps {
  /** Nombres de colores seleccionados. */
  colors: string[];
  /** Abre el modal de configuración de colores. */
  onConfigure: () => void;
  disabled?: boolean;
}

/** Campo "Colores surtidos": etiqueta + botón con contador de selección. */
export function SurtidoColorsField({ colors, onConfigure, disabled }: SurtidoColorsFieldProps) {
  return (
    <div className="flex flex-col space-y-1.5">
      <span className="block text-xs font-bold tracking-wider text-brand-subtitle">
        COLORES SURTIDOS
      </span>
      <Button type="button" variant="secondary" onClick={onConfigure} disabled={disabled}>
        Configurar{colors.length > 0 ? ` (${colors.length})` : ''}
      </Button>
    </div>
  );
}

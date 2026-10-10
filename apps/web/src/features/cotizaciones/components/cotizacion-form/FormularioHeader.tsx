'use client';

import { FileText } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

export interface FormularioHeaderProps {
  numeroCotizacion: string;
  /** Se muestra el botón Limpiar solo si hay contenido en el borrador */
  hayContenido: boolean;
  onLimpiar: () => void;
}

export function FormularioHeader({ numeroCotizacion, hayContenido, onLimpiar }: FormularioHeaderProps) {
  return (
    <div className="flex flex-wrap justify-between items-center w-full gap-2 px-1">
      <div className="flex items-center gap-2.5 min-w-0">
        <FileText className="w-5 h-5 text-brand-ink" aria-hidden="true" />
        <h1 className="text-xl font-black text-zinc-700 tracking-tight truncate">{numeroCotizacion}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hayContenido && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLimpiar}
            title="Descartar el borrador y empezar una cotización nueva"
          >
            Limpiar
          </Button>
        )}
        <Badge size="estado" variant="borrador">
          BORRADOR
        </Badge>
      </div>
    </div>
  );
}

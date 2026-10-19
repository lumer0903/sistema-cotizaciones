'use client';

import { useTableDensity } from '@/hooks/useTableDensity';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './Button';

export function DensityToggle() {
  const { density, toggleDensity } = useTableDensity();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleDensity}
      title={density === 'normal' ? 'Cambiar a vista compacta' : 'Cambiar a vista normal'}
      aria-label={density === 'normal' ? 'Vista compacta' : 'Vista normal'}
      className="gap-1.5"
    >
      {density === 'normal' ? (
        <>
          <Minimize2 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Compacta</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Normal</span>
        </>
      )}
    </Button>
  );
}
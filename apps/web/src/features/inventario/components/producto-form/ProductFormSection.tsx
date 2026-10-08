'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface ProductFormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Título con acción al lado (ej. botón de configurar). */
  headerExtra?: React.ReactNode;
  /** Icono decorativo del encabezado (lucide). */
  icon?: React.ReactNode;
  /** Clases del cuerpo (p.ej. `p-0` para tablas a sangre). */
  bodyClassName?: string;
}

/**
 * Bloque de sección del formulario de producto.
 * Cabecera con chip de icono (brand-soft) + cuerpo; borde sutil y esquinas
 * redondeadas para que la tabla de precios pueda ir a sangre (`bodyClassName="p-0"`).
 */
export function ProductFormSection({
  title,
  children,
  className,
  headerExtra,
  icon,
  bodyClassName,
}: ProductFormSectionProps) {
  return (
    <section
      className={cn('bg-white border border-zinc-200 rounded-xl overflow-hidden', className)}
    >
      {title && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-200/70 bg-surface-muted/70">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-ink [&_svg]:size-3.5"
                aria-hidden="true"
              >
                {icon}
              </span>
            )}
            <h4 className="truncate text-xs font-bold uppercase tracking-wider text-brand-ink">
              {title}
            </h4>
          </div>
          {headerExtra}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

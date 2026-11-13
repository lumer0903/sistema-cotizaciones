'use client';

import React from 'react';
import { cn } from '@/lib/cn';

interface FilterCardProps {
    children: React.ReactNode;
    className?: string;
    accentBorder?: boolean;
}

/**
 * Contenedor base de la barra de filtros según estilo Figma con acento dorado #F8B602.
 */
export const FilterCard: React.FC<FilterCardProps> = ({
    children,
    className = '',
}) => {
    return (
        <div
            className={cn(
                'w-full bg-white rounded-xl border border-slate-200 border-l-4 border-l-[#F8B602] px-4 py-3.5 shadow-sm flex flex-wrap items-end gap-3.5',
                className
            )}
        >
            {children}
        </div>
    );
};

export const FilterBar = FilterCard;

/**
 * Layout flexible responsivo para items de filtros.
 */
export function FilterGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full flex flex-wrap items-end gap-3.5 min-w-0',
        className
      )}
    >
      {children}
    </div>
  );
}

export function FilterActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('shrink-0 flex flex-wrap items-center justify-end gap-2 self-end', className)}>
      {children}
    </div>
  );
}

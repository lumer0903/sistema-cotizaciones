'use client';

import React from 'react';
import { cn } from '@/lib/cn';

interface FilterCardProps {
    children: React.ReactNode;
    className?: string;
    accentBorder?: boolean;
}

export const FilterCard: React.FC<FilterCardProps> = ({
    children,
    className = '',
    accentBorder = false
}) => {
    return (
        <div
            className={cn(
        'w-full min-w-0',
        'bg-surface',
        'rounded-2xl',
        'border border-border-default',
        accentBorder && 'border-l-4 border-l-accent-primary',
        'p-4 sm:p-5',
        'shadow-card',
        'transition-[background-color,border-color,box-shadow] duration-150',
        className
      )}
        >
            {children}
        </div>
    );
  };

/**
 * Responsive filter layout that always spans the full available width (w-full).
 * Children fields proportionally expand to eliminate empty white space on the right,
 * while actions and buttons marked with shrink-0 retain their natural compact size.
 */
export function FilterGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full flex flex-wrap items-end gap-3 sm:gap-4',
        '[&>*:not(.shrink-0)]:flex-1 [&>*:not(.shrink-0)]:min-w-[140px]',
        '[&>*]:min-w-0',
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


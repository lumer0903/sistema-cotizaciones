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
        'w-full',
        'min-w-0',
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
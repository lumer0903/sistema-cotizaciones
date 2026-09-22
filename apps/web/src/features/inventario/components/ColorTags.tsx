'use client';

import { X } from 'lucide-react';

interface ColorTagsProps {
  colors: string[] | null | undefined;
  maxVisible?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
  interactive?: boolean;
  onRemove?: (color: string) => void;
  className?: string;
}

export function ColorTags({
  colors,
  maxVisible = 3,
  size = 'md',
  showCount = true,
  interactive = false,
  onRemove,
  className = '',
}: ColorTagsProps) {
  const validColors = colors?.filter(Boolean) ?? [];
  const visibleColors = validColors.slice(0, maxVisible);
  const remainingCount = validColors.length - maxVisible;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
  };

  const iconSize = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
  };

  if (validColors.length === 0) {
    return (
      <span className={`text-xs text-brand-options italic ${className}`}>
        Sin colores
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      {visibleColors.map((color) => (
        <span
          key={color}
          className={`inline-flex items-center ${sizeClasses[size]} bg-brand-selection text-brand-subtitle border border-brand-primary/40 rounded-full font-medium`}
        >
          {color}
          {interactive && onRemove && (
            <button
              onClick={() => onRemove(color)}
              className={`ml-1 p-0.5 rounded-full hover:bg-brand-selection transition-colors text-brand-primary hover:text-brand-hover ${iconSize[size]}`}
              aria-label={`Eliminar ${color}`}
            >
              <X className={iconSize[size]} />
            </button>
          )}
        </span>
      ))}
      {showCount && remainingCount > 0 && (
        <span className={`inline-flex items-center justify-center ${sizeClasses[size]} bg-gray-100 text-brand-options border border-gray-200 rounded-full font-medium`}>
          +{remainingCount}
        </span>
      )}
    </span>
  );
}
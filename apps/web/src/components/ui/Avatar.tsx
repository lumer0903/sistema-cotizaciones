'use client';

import { useState } from 'react';
import Image from 'next/image';

function initialsOf(nombre?: string | null): string {
  if (!nombre?.trim()) return 'U';
  return nombre
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export interface AvatarProps {
  src?: string | null;
  nombre?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  title?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-24 w-24 text-2xl',
};

export function Avatar({ src, nombre, size = 'md', className = '', onClick, title }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(src) && !failed;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`shrink-0 rounded-full overflow-hidden bg-brand-soft border border-gray-200 flex items-center justify-center font-bold text-brand-primary select-none ${SIZE_CLASSES[size]} ${onClick ? 'hover:border-brand-primary transition-colors cursor-pointer' : ''} ${className}`}
    >
      {showImg ? (
        <Image
          src={src as string}
          alt={nombre || 'Avatar'}
          width={96}
          height={96}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsOf(nombre)
      )}
    </Tag>
  );
}

'use client';

import { usePermissions } from '@/hooks/usePermissions';
import { PermisoModulo } from '@goldcontinent/shared/auth';
import { ReactNode } from 'react';

interface CanProps {
  modulo: PermisoModulo;
  nivel: 'lectura' | 'edicion';
  children?: ReactNode;
  fallback?: ReactNode;
}

export const Can: React.FC<CanProps> = ({ modulo, nivel, children, fallback }) => {
  const { can } = usePermissions();

  if (can(modulo, nivel)) {
    return children as ReactNode;
  }

  return fallback ?? null;
};

Can.displayName = 'Can';
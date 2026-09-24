export * from './Input';
export * from './Select';
export * from './Button';
export * from './Tooltip';
export * from './Modal';
export * from './ConfirmModal';
export * from './Badge';
export * from './Table';
export * from './FilterCard';
export * from './Pagination';
export * from './Textarea';
export * from './Sidebar';

import type { BadgeVariant } from './Badge';

/** Mapeo central de estados de cotización → variante de Badge (Admin = Vendedor). */
export const ESTADO_BADGE: Record<string, BadgeVariant> = {
  BORRADOR: 'borrador',
  borrador: 'borrador',
  ENVIADO: 'enviado',
  enviado: 'enviado',
  ENVIADA: 'enviado',
  enviada: 'enviado',
  APROBADO: 'aprobado',
  aprobado: 'aprobado',
  APROBADA: 'aprobado',
  aprobada: 'aprobado',
  RECHAZADO: 'rechazado',
  rechazado: 'rechazado',
  RECHAZADA: 'rechazado',
  rechazada: 'rechazado',
  PARCIALMENTE_PAGADA: 'warning',
  parcialmente_pagada: 'warning',
};

/** Mapea tipo de cliente → variante de Badge. */
export const TIPO_CLIENTE_BADGE: Record<string, BadgeVariant> = {
  tienda: 'tienda',
  TIENDA: 'tienda',
  distribuidor: 'distribuidor',
  DISTRIBUIDOR: 'distribuidor',
};

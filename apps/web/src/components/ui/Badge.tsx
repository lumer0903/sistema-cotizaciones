'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'secondary'
  | 'tienda'
  | 'distribuidor'
  | 'borrador'
  | 'aprobado'
  | 'rechazado'
  | 'enviado'
  | 'parcial'
  | 'vendedor'
  | 'gerente'
  | 'administrador'
  | 'activo'
  | 'inactivo';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'estado' | 'xl';
  className?: string;
}

/* ── Mapas únicos de estilo (fuente única por modo de render) ── */

/** Cápsula grande (encabezados y detalle/resumen). */
const XL_STYLES: Record<string, string> = {
  neutral: 'bg-status-borrador outline-brand-options text-status-borrador-text',
  secondary: 'bg-status-borrador outline-brand-options text-status-borrador-text',
  borrador: 'bg-status-borrador outline-brand-options text-status-borrador-text',
  brand: 'bg-accent-soft outline-accent-primary text-accent-ink',
  enviado: 'bg-status-enviado-soft outline-status-enviado text-status-enviado-text',
  aprobado: 'bg-status-aprobado-soft outline-status-aprobado text-status-aprobado-text',
  rechazado: 'bg-status-rechazado-soft outline-status-rechazado text-status-rechazado-text',
  parcial: 'bg-amber-50 outline-amber-500 text-amber-600',
};

/** Cápsula de estado/tipo (tabla, listas y reportes). */
const ESTADO_STYLES: Record<string, string> = {
  borrador: 'bg-status-borrador text-status-borrador-text border-status-borrador/60',
  enviado: 'bg-status-enviado-soft text-status-enviado-text border-status-enviado/40',
  aprobado: 'bg-status-aprobado-soft text-status-aprobado-text border-status-aprobado/40',
  rechazado: 'bg-status-rechazado-soft text-status-rechazado-text border-status-rechazado/40',
  parcial: 'bg-amber-50 text-amber-700 border-amber-500/40',
  tienda: 'bg-role-tienda-soft text-role-tienda border-role-tienda/40',
  distribuidor: 'bg-role-distribuidor-soft text-role-distribuidor border-role-distribuidor/40',
  neutral: 'bg-status-borrador text-status-borrador-text border-brand-options/40',
  brand: 'bg-accent-soft text-accent-ink border-accent-primary/40',
};

/** Texto plano (sin fondo ni bordes) — tabla del sistema. */
const PLAIN_TEXT_STYLES: Record<string, string> = {
  borrador: 'text-brand-options font-bold uppercase tracking-wide',
  enviado: 'text-role-tienda font-bold uppercase tracking-wide',
  aprobado: 'text-status-aprobado-text font-bold uppercase tracking-wide',
  rechazado: 'text-status-rechazado font-bold uppercase tracking-wide',
  parcial: 'text-amber-700 font-bold uppercase tracking-wide',
  tienda: 'text-role-tienda font-bold uppercase',
  distribuidor: 'text-role-distribuidor font-bold uppercase',
  vendedor: 'text-vendedor-ink font-semibold',
  gerente: 'text-brand-ink font-semibold',
  administrador: 'text-brand-ink font-semibold',
  activo: 'text-emerald-600 font-bold uppercase',
  inactivo: 'text-rose-500 font-bold uppercase',
};

/** Pills con fondo y borde (variantes genéricas). */
const PILL_STYLES: Record<string, string> = {
  brand: 'bg-accent-selection text-brand-subtitle border-accent-primary/40',
  success: 'bg-status-aprobado-soft text-status-aprobado-text border-status-aprobado/40',
  warning: 'bg-status-advertencia-soft text-status-advertencia-text border-status-advertencia-text/40',
  danger: 'bg-status-rechazado-soft text-status-rechazado-text border-status-rechazado/40',
  neutral: 'bg-status-borrador text-status-borrador-text border-status-borrador',
  secondary: 'bg-status-enviado-soft text-status-enviado-text border-status-enviado/40',
  tienda: 'bg-role-tienda-soft text-role-tienda border-role-tienda/40',
  distribuidor: 'bg-role-distribuidor-soft text-role-distribuidor border-role-distribuidor/40',
};

const PILL_SIZES: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs font-bold tracking-wider uppercase',
  md: 'px-2.5 py-1 text-xs font-semibold',
  estado: 'px-2 py-0.5 text-xs font-bold tracking-wider uppercase',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'sm',
  className,
}) => {
  // Pill grande (diseño Figma): encabezados y detalle/resumen.
  if (size === 'xl') {
    const color = XL_STYLES[variant] ?? XL_STYLES.neutral;
    return (
      <span
        className={cn(
          'inline-flex justify-center items-center h-9 px-4 rounded-xl outline outline-1 outline-offset-[-1px] text-base font-bold',
          color,
          className
        )}
      >
        {children}
      </span>
    );
  }

  // Cápsula de estado/tipo (tabla, listas y reportes).
  if (size === 'estado') {
    const color = ESTADO_STYLES[variant] ?? ESTADO_STYLES.neutral;
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
          color,
          className
        )}
      >
        {children}
      </span>
    );
  }

  // Texto plano (sin fondo ni bordes)
  if (variant in PLAIN_TEXT_STYLES) {
    return (
      <span className={cn('text-sm', PLAIN_TEXT_STYLES[variant], className)}>{children}</span>
    );
  }

  // Pills con fondo y borde
  const color = PILL_STYLES[variant] ?? PILL_STYLES.neutral;
  const sizeClass = PILL_SIZES[size] ?? PILL_SIZES.md;
  return (
    <span
      className={cn('inline-flex items-center rounded-xl border', color, sizeClass, className)}
    >
      {children}
    </span>
  );
};

export interface StatusBadgeProps {
  children: React.ReactNode;
  /** Estado semántico (borrador/enviado/aprobado/rechazado/parcial/tienda/...). */
  variant?: BadgeVariant;
  className?: string;
}

/**
 * Cápsula de estado estándar para tablas, listas y reportes.
 * Uso preferente frente a <Badge size="estado"> (semántica explícita).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ children, variant, className }) => (
  <Badge variant={variant} size="estado" className={className}>
    {children}
  </Badge>
);

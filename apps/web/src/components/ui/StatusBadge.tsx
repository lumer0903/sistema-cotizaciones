'use client';

import React from 'react';
import { cn } from '@/lib/cn';

// ==========================================
// 1. StatusBadge (Píldora neutra + punto de color)
// ==========================================

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  dotColor: string;
  label: string;
  className?: string;
}

/**
 * Píldora neutra con punto de color para todos los ESTADOS del sistema.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  dotColor,
  label,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] px-2.5 py-0.5 text-xs font-medium text-[#414141] whitespace-nowrap',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="inline-block w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span>{label}</span>
    </span>
  );
};

// ==========================================
// Mapeos de Estados conocidos
// ==========================================

export interface StatusMeta {
  dotColor: string;
  label: string;
}

/** Estados de Cotización */
export const COTIZACION_STATUS_MAP: Record<string, StatusMeta> = {
  BORRADOR: { dotColor: '#8D8D8D', label: 'Borrador' },
  borrador: { dotColor: '#8D8D8D', label: 'Borrador' },
  ENVIADO: { dotColor: '#006EFF', label: 'Enviado' },
  enviado: { dotColor: '#006EFF', label: 'Enviado' },
  ENVIADA: { dotColor: '#006EFF', label: 'Enviado' },
  enviada: { dotColor: '#006EFF', label: 'Enviado' },
  PARCIALMENTE_PAGADA: { dotColor: '#F8B602', label: 'Pago parcial' },
  parcialmente_pagada: { dotColor: '#F8B602', label: 'Pago parcial' },
  PARCIAL: { dotColor: '#F8B602', label: 'Pago parcial' },
  parcial: { dotColor: '#F8B602', label: 'Pago parcial' },
  APROBADO: { dotColor: '#0CC200', label: 'Aprobado' },
  aprobado: { dotColor: '#0CC200', label: 'Aprobado' },
  APROBADA: { dotColor: '#0CC200', label: 'Aprobado' },
  aprobada: { dotColor: '#0CC200', label: 'Aprobado' },
  ACEPTADO: { dotColor: '#0CC200', label: 'Aprobado' },
  aceptado: { dotColor: '#0CC200', label: 'Aprobado' },
  RECHAZADO: { dotColor: '#7B1C1C', label: 'Rechazado' },
  rechazado: { dotColor: '#7B1C1C', label: 'Rechazado' },
  RECHAZADA: { dotColor: '#7B1C1C', label: 'Rechazado' },
  rechazada: { dotColor: '#7B1C1C', label: 'Rechazado' },
};

export function CotizacionStatusBadge({ estado, className }: { estado: string; className?: string }) {
  const meta = COTIZACION_STATUS_MAP[estado] ?? {
    dotColor: '#8D8D8D',
    label: estado || 'Borrador',
  };
  return <StatusBadge dotColor={meta.dotColor} label={meta.label} className={className} />;
}

/** Estados de Cobranza */
export const COBRANZA_STATUS_MAP: Record<string, StatusMeta> = {
  pendiente: { dotColor: '#8D8D8D', label: 'Pendiente' },
  PENDIENTE: { dotColor: '#8D8D8D', label: 'Pendiente' },
  parcial: { dotColor: '#F8B602', label: 'Parcial' },
  PARCIAL: { dotColor: '#F8B602', label: 'Parcial' },
  pagada: { dotColor: '#0CC200', label: 'Pagada' },
  PAGADA: { dotColor: '#0CC200', label: 'Pagada' },
  vencida: { dotColor: '#7B1C1C', label: 'Vencida' },
  VENCIDA: { dotColor: '#7B1C1C', label: 'Vencida' },
};

export function CobranzaStatusBadge({ estado, className }: { estado: string; className?: string }) {
  const meta = COBRANZA_STATUS_MAP[estado] ?? {
    dotColor: '#8D8D8D',
    label: estado || 'Pendiente',
  };
  return <StatusBadge dotColor={meta.dotColor} label={meta.label} className={className} />;
}

/** Estado de Usuario (Activo / Inactivo) */
export function UsuarioStatusBadge({ activo, className }: { activo: boolean; className?: string }) {
  return activo ? (
    <StatusBadge dotColor="#0CC200" label="Activo" className={className} />
  ) : (
    <StatusBadge dotColor="#7B1C1C" label="Inactivo" className={className} />
  );
}

// ==========================================
// 2. CategoryTag (Etiqueta rectangular sin punto para Tipos / Roles)
// ==========================================

export interface CategoryTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'distribuidor' | 'tienda' | 'admin' | 'gerente' | 'vendedor' | 'custom';
  customClass?: string;
  className?: string;
}

const CATEGORY_TAG_STYLES = {
  distribuidor: 'bg-[#FFF3E4] border-[#FEDEBA] text-[#9D3A19]',
  tienda: 'bg-[#E8F2FE] border-[#C4DEFE] text-[#1F41AF]',
  admin: 'bg-[#F8B602]/15 border-[#F8B602]/40 text-[#9D3A19]',
  gerente: 'bg-[#E8F2FE] border-[#C4DEFE] text-[#1F41AF]',
  vendedor: 'bg-[#F3F4F6] border-[#E5E7EB] text-[#414141]',
};

export const CategoryTag: React.FC<CategoryTagProps> = ({
  children,
  variant,
  customClass,
  className,
  ...props
}) => {
  const variantClass = variant && variant in CATEGORY_TAG_STYLES
    ? CATEGORY_TAG_STYLES[variant as keyof typeof CATEGORY_TAG_STYLES]
    : customClass || 'bg-[#F3F4F6] border-[#E5E7EB] text-[#414141]';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap',
        variantClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

/** Tag para Tipo de Cliente */
export function ClienteTipoTag({ tipo, className }: { tipo: string; className?: string }) {
  const normalized = String(tipo || '').toLowerCase();
  const variant = normalized === 'distribuidor' ? 'distribuidor' : 'tienda';
  return (
    <CategoryTag variant={variant} className={className}>
      {tipo}
    </CategoryTag>
  );
}

/** Tag determinístico para Roles (estáticos y dinámicos) */
const DYNAMIC_ROLE_PALETTES = [
  'bg-amber-50 border-amber-200 text-amber-800',
  'bg-sky-50 border-sky-200 text-sky-800',
  'bg-stone-100 border-stone-200 text-[#414141]',
];

function getDynamicRoleStyle(role: string): string {
  let hash = 0;
  for (let i = 0; i < role.length; i++) {
    hash = (hash << 5) - hash + role.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DYNAMIC_ROLE_PALETTES.length;
  return DYNAMIC_ROLE_PALETTES[index];
}

export function UsuarioRoleTag({ rol, className }: { rol: string; className?: string }) {
  const normalized = String(rol || '').toLowerCase().trim();
  if (normalized === 'admin') {
    return <CategoryTag variant="admin" className={className}>admin</CategoryTag>;
  }
  if (normalized === 'gerente') {
    return <CategoryTag variant="gerente" className={className}>gerente</CategoryTag>;
  }
  if (normalized === 'vendedor') {
    return <CategoryTag variant="vendedor" className={className}>vendedor</CategoryTag>;
  }
  return (
    <CategoryTag customClass={getDynamicRoleStyle(normalized)} className={className}>
      {rol}
    </CategoryTag>
  );
}

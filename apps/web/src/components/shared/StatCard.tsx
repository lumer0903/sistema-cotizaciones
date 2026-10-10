'use client';

import React from 'react';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StatTone = 'brand' | 'success' | 'info' | 'warning' | 'danger';

const TONE_STYLES: Record<StatTone, string> = {
  brand: 'bg-brand-soft text-brand-ink',
  success: 'bg-status-aprobado-soft text-status-aprobado-text',
  info: 'bg-status-enviado-soft text-status-enviado-text',
  warning: 'bg-status-advertencia-soft text-status-advertencia-text',
  danger: 'bg-status-rechazado-soft text-status-rechazado-text',
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  /** Si se provee, la tarjeta es navegable (cursor-pointer + hover). */
  href?: string;
  className?: string;
}

/**
 * Tarjeta KPI: fondo suave + icono coloreado (contraste AA garantizado,
 * sin rellenos saturados con texto blanco).
 */
export function StatCard({ label, value, icon: Icon, tone = 'brand', href, className }: StatCardProps) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-600 line-clamp-2 leading-tight min-h-[2rem]">{label}</p>
        <p className="text-2xl font-bold text-brand-subtitle mt-1 tnum truncate">{value}</p>
      </div>
      <div
        className={cn('p-3 rounded-xl shrink-0', TONE_STYLES[tone])}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6" />
      </div>
    </>
  );

  const baseClass = cn(
    'bg-white rounded-xl border border-zinc-200 p-4 flex items-center justify-between gap-3',
    'transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-md hover:border-brand-primary/50',
    href && 'cursor-pointer',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={`${label}: ${String(value)}`}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

/** Skeleton de carga para StatCard. */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="h-4 w-24 bg-zinc-200 rounded mb-2" />
          <div className="h-8 w-16 bg-zinc-200 rounded" />
        </div>
        <div className="h-12 w-12 bg-zinc-200 rounded-xl" />
      </div>
    </div>
  );
}

'use client';

import { LayoutDashboard, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { usePermissions } from '@/hooks/usePermissions';
import type { DashboardView } from '../store/useDashboardStore';

interface DashboardToggleProps {
  view: DashboardView;
  onChange: (view: DashboardView) => void;
}

/**
 * Selector segmentado Admin / Vendedor. Visible para admin/gerente;
 * vendedor tiene vista forzada a 'vendedor'.
 */
export function DashboardToggle({ view, onChange }: DashboardToggleProps) {
  const { isVendedor } = usePermissions();

  // Vendedor nunca ve el toggle, su vista siempre es 'vendedor'
  if (isVendedor) return null;

  // Admin/Gerente ven el toggle y pueden cambiar
  return (
    <div
      role="group"
      aria-label="Vista del dashboard"
      className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
    >
      <button
        type="button"
        onClick={() => onChange('admin')}
        aria-pressed={view === 'admin'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          view === 'admin'
            ? 'bg-accent-primary text-zinc-900'
            : 'text-brand-options hover:text-brand-subtitle hover:bg-zinc-50'
        )}
      >
        <LayoutDashboard className="size-3.5" aria-hidden="true" />
        Admin
      </button>
      <button
        type="button"
        onClick={() => onChange('vendedor')}
        aria-pressed={view === 'vendedor'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          view === 'vendedor'
            ? 'bg-vendedor-primary text-white'
            : 'text-brand-options hover:text-brand-subtitle hover:bg-zinc-50'
        )}
      >
        <User className="size-3.5" aria-hidden="true" />
        Vendedor
      </button>
    </div>
  );
}
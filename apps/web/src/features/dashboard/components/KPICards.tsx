'use client';

import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Wallet,
  Target,
  Percent,
  FileText,
  Clock,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { apiClient } from '@/lib/apiClient';
import type { DashboardKpis } from '../types/dashboard';
import type { DashboardView } from '../types/dashboard';
import type { AlertaStockBajo } from '../types/dashboard';

const fmtSoles = (v: number) => `S/ ${v.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`;
const fmtNumber = (v: number) => v.toLocaleString('es-PE');

interface CobranzaResponse {
  data?: Array<{ saldo?: number; montoPendiente?: number }>;
}

function useMontoPendiente() {
  return useQuery({
    queryKey: ['dashboard', 'cobranza-pendiente'],
    queryFn: async () => {
      const res = await apiClient<CobranzaResponse>('/cobranza?limit=200');
      return (res.data ?? []).reduce(
        (sum, c) => sum + Number(c.saldo ?? c.montoPendiente ?? 0),
        0
      );
    },
  });
}

interface KPICardsProps {
  kpis?: DashboardKpis;
  cotizacionesPorEstadoTotal?: number;
  stockBajo?: AlertaStockBajo[];
  view: DashboardView;
  loading: boolean;
}

const ROLE_COLORS = {
  admin: {
    primary: 'bg-accent-primary',
    primaryText: 'text-accent-ink',
    primaryBorder: 'border-accent-primary/40',
    primaryBg: 'bg-accent-selection',
    ring: 'focus-visible:ring-accent-primary',
  },
  vendedor: {
    primary: 'bg-vendedor-primary',
    primaryText: 'text-vendedor-ink',
    primaryBorder: 'border-vendedor-primary/40',
    primaryBg: 'bg-vendedor-soft',
    ring: 'focus-visible:ring-vendedor-primary',
  },
} as const;

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  role,
  href,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  subtitle?: string;
  role: 'admin' | 'vendedor';
  href?: string;
}) {
  const colors = ROLE_COLORS[role];
  const content = (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-brand-options line-clamp-2 leading-tight">{title}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-0.5 tnum">{value}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-brand-options line-clamp-1">{subtitle}</p>}
    </div>
  );

  const baseClass = cn(
    'bg-surface border border-border-default rounded-2xl p-4 shadow-card h-full',
    'transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-card-hover hover:border-border-default/80',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    href && 'cursor-pointer',
  );

  const iconBox = (
    <div
      className={cn(
        'p-2.5 rounded-xl shrink-0',
        colors.primaryBg,
      )}
      aria-hidden="true"
    >
      <Icon className={cn('h-5 w-5', colors.primaryText)} />
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cn(baseClass, 'group flex flex-col justify-between gap-3')}
        aria-label={`${title}: ${String(value)}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">{content}</div>
          {iconBox}
        </div>
      </a>
    );
  }

  return (
    <div className={cn(baseClass, 'flex flex-col justify-between gap-3')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">{content}</div>
        {iconBox}
      </div>
    </div>
  );
}

export function KPICards({ kpis, cotizacionesPorEstadoTotal, stockBajo, view, loading }: KPICardsProps) {
  const montoPendiente = useMontoPendiente();
  const role: 'admin' | 'vendedor' = view === 'admin' ? 'admin' : 'vendedor';

  if (loading) {
    return (
      <div className="mb-6 max-w-[1200px] mx-auto" role="status" aria-live="polite">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border-default rounded-2xl p-4 animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="h-4 w-3/4 bg-surface-muted rounded mb-2" />
                  <div className="h-8 w-20 bg-surface-muted rounded" />
                  <div className="mt-2 h-4 w-24 bg-surface-muted rounded" />
                </div>
                <div className="h-10 w-10 bg-surface-muted rounded-xl shrink-0" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Cargando tarjetas KPI…</span>
      </div>
    );
  }

  const ventasTotales = kpis?.ventasTotales ?? 0;
  const porCobrar = montoPendiente.data ?? 0;
  const alertasStock = kpis?.alertasStockActivas ?? stockBajo?.length ?? 0;
  const totalCotizaciones = cotizacionesPorEstadoTotal ?? 0;

  if (view === 'admin') {
    const cards = [
      {
        title: 'Total Ventas del Mes',
        value: fmtSoles(ventasTotales),
        icon: DollarSign,
        subtitle: 'Facturación mensual',
        role,
        href: '/cotizaciones?estado=aprobada',
      },
      {
        title: 'Total por Cobrar',
        value: fmtSoles(porCobrar),
        icon: Wallet,
        subtitle: `${alertasStock} alertas de stock activas`,
        role,
        href: '/cobranza',
      },
      {
        title: 'Cotizaciones del Mes',
        value: fmtNumber(totalCotizaciones),
        icon: FileText,
        subtitle: 'Documentos en el período',
        role,
        href: '/cotizaciones',
      },
      {
        title: 'Productos con Stock Bajo',
        value: fmtNumber(alertasStock),
        icon: Package,
        subtitle: 'Requieren reposición',
        role,
        href: '/inventario',
      },
    ];

    return (
      <div className="mb-6 max-w-[1200px] mx-auto" role="region" aria-label="Indicadores principales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((c) => (
            <MetricCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Mi Total Vendido',
      value: fmtSoles(ventasTotales),
      icon: DollarSign,
      subtitle: 'Mes actual',
      role,
      href: '/cotizaciones?estado=aprobada',
    },
    {
      title: 'Mis Cotizaciones Emitidas',
      value: fmtNumber(totalCotizaciones),
      icon: FileText,
      subtitle: 'Documentos creados',
      role,
      href: '/cotizaciones',
    },
    {
      title: 'Mi Cartera por Cobrar',
      value: fmtSoles(porCobrar),
      icon: Wallet,
      subtitle: 'Pendiente de pago',
      role,
      href: '/cobranza',
    },
    {
      title: 'Stock Bajo (Global)',
      value: fmtNumber(alertasStock),
      icon: Package,
      subtitle: 'Alertas activas',
      role,
      href: '/inventario',
    },
  ];

  return (
    <div className="mb-6 max-w-[1200px] mx-auto" role="region" aria-label="Mis indicadores">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((c) => (
          <MetricCard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}

export function IndicadoresTesis({ kpis, view }: { kpis?: DashboardKpis; view: DashboardView }) {
  const role: 'admin' | 'vendedor' = view === 'admin' ? 'admin' : 'vendedor';
  const colors = ROLE_COLORS[role];

  const items = [
    {
      label: 'Eficacia de Cotización',
      value: fmtPct(kpis?.eficacia ?? 0),
      icon: Target,
      description: 'Aprobadas / Total registradas',
    },
    {
      label: 'Rendimiento Monetario',
      value: fmtPct(kpis?.rendimientoMonetario ?? 0),
      icon: Percent,
      description: 'Dinero convertido / Total',
    },
    {
      label: 'Tiempo Promedio',
      value: `${(kpis?.tiempoPromedioCotizacion ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })} min`,
      icon: Clock,
      description: 'Generación de cotización',
    },
  ];

  return (
    <section
      className={cn(
        'mt-6 border-t border-border-default pt-6 rounded-2xl p-4 sm:p-5 border transition-[background-color,border-color]',
        view === 'admin'
          ? 'bg-amber-50/40 border-amber-200/60'
          : 'bg-red-50/40 border-red-200/60',
      )}
      aria-labelledby="indicadores-tesis"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide',
              view === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800',
            )}
          >
            Tesis
          </span>
          <h2 id="indicadores-tesis" className="text-base sm:text-lg font-bold text-zinc-900">
            Indicadores de Eficiencia
          </h2>
        </div>
        <div className={cn('p-2 rounded-xl', colors.primaryBg)}>
          <Target className={cn('h-5 w-5', colors.primaryText)} />
        </div>
      </header>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {items.map((ind) => (
          <div
            key={ind.label}
            className="bg-surface/70 backdrop-blur-sm rounded-xl border border-border-default p-3 sm:p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-semibold text-brand-options">{ind.label}</p>
              <div className={cn('p-1.5 rounded-lg', colors.primaryBg)}>
                <ind.icon className={cn('h-4 w-4', colors.primaryText)} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 tnum">{ind.value}</p>
            <p className="mt-0.5 text-[11px] text-brand-options">{ind.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
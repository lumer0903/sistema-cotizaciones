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
    primary: 'bg-amber-500',
    primaryText: 'text-amber-600',
    primaryBorder: 'border-amber-200',
    primaryBg: 'bg-amber-50',
    ring: 'focus-visible:ring-amber-500',
  },
  vendedor: {
    primary: 'bg-red-700',
    primaryText: 'text-red-700',
    primaryBorder: 'border-red-200',
    primaryBg: 'bg-red-50',
    ring: 'focus-visible:ring-red-700',
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
      <p className="text-xs font-semibold text-zinc-600 line-clamp-2 leading-tight">{title}</p>
      <p className="text-2xl font-bold text-zinc-900 mt-0.5 tnum">{value}</p>
      {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500 line-clamp-1">{subtitle}</p>}
    </div>
  );

  const baseClass = cn(
    'bg-white border border-zinc-100 rounded-2xl p-4 shadow-sm h-full',
    'transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-md hover:border-zinc-200',
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
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="status" aria-live="polite">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-zinc-200 rounded mb-2" />
            <div className="h-8 w-20 bg-zinc-200 rounded" />
            <div className="mt-2 h-4 w-24 bg-zinc-200 rounded" />
          </div>
        ))}
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
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" aria-label="Indicadores principales">
        {cards.map((c) => (
          <MetricCard key={c.title} {...c} />
        ))}
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
    <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" aria-label="Mis indicadores">
      {cards.map((c) => (
        <MetricCard key={c.title} {...c} />
      ))}
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
        'mb-6 rounded-2xl p-4 sm:p-5 border transition-[background-color,border-color]',
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
            className="bg-white/70 backdrop-blur-sm rounded-xl border border-zinc-100 p-3 sm:p-4"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-xs font-semibold text-zinc-600">{ind.label}</p>
              <div className={cn('p-1.5 rounded-lg', colors.primaryBg)}>
                <ind.icon className={cn('h-4 w-4', colors.primaryText)} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900 tnum">{ind.value}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500">{ind.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
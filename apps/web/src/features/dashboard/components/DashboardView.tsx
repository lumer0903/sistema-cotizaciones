'use client';

import { Package, FileText, DollarSign, TrendingUp, Wallet, Clock, Target, Percent } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/types';
import { StatCard, StatCardSkeleton, StatTone } from '@/components/shared/StatCard';
import { Button } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';

interface KpisTesis {
  tiempoPromedioCotizacion: number;
  eficacia: number;
  rendimientoMonetario: number;
  ventasTotales?: number;
}

interface StatCardConfig {
  label: string;
  value: string | number;
  icon: typeof Package;
  tone: StatTone;
  href: string;
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpis, setKpis] = useState<KpisTesis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { isAdmin } = usePermissions();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [productos, cotizaciones, aprobadas, cobranza, kpisRes] = await Promise.all([
        apiClient('/productos?limit=1'),
        apiClient('/cotizaciones?limit=1'),
        apiClient('/cotizaciones?estado=aprobada&limit=1'),
        apiClient('/cobranza?limit=100'),
        apiClient('/dashboard/kpis').catch(() => null),
      ]);

      setKpis(kpisRes?.data ?? null);
      setStats({
        totalProductos: productos.total || 0,
        totalCotizaciones: cotizaciones.total || 0,
        cotizacionesAprobadas: aprobadas.total || 0,
        montoPendiente:
          cobranza.data?.reduce(
            (sum: number, c: { saldo?: number; montoPendiente?: number }) =>
              sum + Number(c.saldo ?? c.montoPendiente ?? 0),
            0,
          ) || 0,
        productosBajoStock: 0,
        cotizacionesEsteMes: 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchStats]);

  const fmtPct = (v: number | undefined) =>
    `${(v ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`;

  const indicadoresTesis = [
    {
      label: 'Tiempo promedio de generación',
      value: `${(kpis?.tiempoPromedioCotizacion ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })} min`,
      icon: Clock,
      tone: 'brand' as const,
    },
    {
      label: 'Eficacia (cotizaciones aceptadas)',
      value: fmtPct(kpis?.eficacia),
      icon: Target,
      tone: 'success' as const,
    },
    {
      label: 'Rendimiento monetario',
      value: fmtPct(kpis?.rendimientoMonetario),
      icon: Percent,
      tone: 'warning' as const,
    },
  ];

  const statCards: StatCardConfig[] = [
    {
      label: 'Productos',
      value: stats?.totalProductos || 0,
      icon: Package,
      tone: 'info',
      href: '/inventario',
    },
    {
      label: isAdmin ? 'Cotizaciones' : 'Mis cotizaciones',
      value: stats?.totalCotizaciones || 0,
      icon: FileText,
      tone: 'brand',
      href: '/cotizaciones',
    },
    {
      label: isAdmin ? 'Aprobadas' : 'Mis aprobadas',
      value: stats?.cotizacionesAprobadas || 0,
      icon: TrendingUp,
      tone: 'success',
      href: '/cotizaciones',
    },
    {
      label: 'Ventas',
      value: `S/ ${(kpis?.ventasTotales ?? 0).toLocaleString()}`,
      icon: DollarSign,
      tone: 'warning',
      href: '/cotizaciones',
    },
    {
      label: 'Por Cobrar',
      value: stats?.montoPendiente ? `S/ ${stats.montoPendiente.toLocaleString()}` : 'S/ 0',
      icon: Wallet,
      tone: 'danger',
      href: '/cobranza',
    },
  ];

  const accesosRapidos = [
    {
      href: '/inventario',
      icon: Package,
      title: 'Gestionar Productos',
      description: 'Inventario, precios, importación',
    },
    {
      href: '/cotizaciones/crear?nueva=1',
      icon: FileText,
      title: 'Nueva Cotización',
      description: 'Crear cotización para cliente',
    },
    {
      href: '/cobranza',
      icon: DollarSign,
      title: 'Cobranza',
      description: 'Registrar pagos de cotizaciones',
    },
  ];

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-label="Cargando dashboard">
        <span className="sr-only">Cargando métricas del dashboard…</span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 sm:p-6 mb-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>
      {error && !stats && (
        <div
          role="alert"
          className="mb-8 bg-estado-rechazado-soft border border-estado-rechazado/30 text-danger p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between"
        >
          <span>No se pudieron cargar las métricas del dashboard.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchStats()}
            className="ml-4 underline font-bold text-red-700 hover:text-red-800"
          >
            Reintentar
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            href={stat.href}
          />
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 sm:p-6 mb-8" aria-labelledby="indicadores-tesis">
        <h2 id="indicadores-tesis" className="text-lg font-semibold text-brand-subtitle mb-1">
          Indicadores de la tesis
        </h2>
        <p className="text-sm text-brand-options mb-4">
          Tiempo, eficacia y rendimiento {isAdmin ? 'de las cotizaciones' : 'de tus cotizaciones'}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {indicadoresTesis.map((ind) => (
            <StatCard
              key={ind.label}
              label={ind.label}
              value={ind.value}
              icon={ind.icon}
              tone={ind.tone}
            />
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4 sm:p-6" aria-labelledby="accesos-rapidos">
        <h2 id="accesos-rapidos" className="text-lg font-semibold text-brand-subtitle mb-4">
          Accesos rápidos
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accesosRapidos.map((acceso) => (
            <Link
              key={acceso.href}
              href={acceso.href}
              className="group p-4 rounded-lg border border-zinc-200 hover:border-brand-primary/50 hover:bg-brand-selection/50 transition-colors cursor-pointer"
            >
              <acceso.icon
                className="h-8 w-8 text-brand-ink mb-2 transition-colors group-hover:text-brand-primary"
                aria-hidden="true"
              />
              <p className="font-medium text-brand-subtitle">{acceso.title}</p>
              <p className="text-sm text-brand-options mt-1">{acceso.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

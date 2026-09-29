'use client';

import { Package, FileText, DollarSign, TrendingUp, Clock, Target, Percent } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/types';

interface KpisTesis {
  tiempoPromedioCotizacion: number;
  eficacia: number;
  rendimientoMonetario: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kpis, setKpis] = useState<KpisTesis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
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
              (sum: number, c: any) => sum + Number(c.saldo ?? c.montoPendiente ?? 0),
              0,
            ) || 0,
          productosBajoStock: 0,
          cotizacionesEsteMes: 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const fmtPct = (v: number | undefined) =>
    `${(v ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })}%`;

  const indicadoresTesis = [
    {
      label: 'Tiempo promedio de generación',
      value: `${(kpis?.tiempoPromedioCotizacion ?? 0).toLocaleString('es-PE', { maximumFractionDigits: 2 })} min`,
      icon: Clock,
      color: 'bg-brand-primary',
    },
    {
      label: 'Eficacia (cotizaciones aceptadas)',
      value: fmtPct(kpis?.eficacia),
      icon: Target,
      color: 'bg-estado-aprobado',
    },
    {
      label: 'Rendimiento monetario',
      value: fmtPct(kpis?.rendimientoMonetario),
      icon: Percent,
      color: 'bg-distribuidor',
    },
  ];

  const statCards = [
    { label: 'Productos', value: stats?.totalProductos || 0, icon: Package, color: 'bg-estado-enviado', href: '/admin/productos' },
    { label: 'Cotizaciones', value: stats?.totalCotizaciones || 0, icon: FileText, color: 'bg-brand-primary', href: '/admin/cotizaciones' },
    { label: 'Aprobadas', value: stats?.cotizacionesAprobadas || 0, icon: DollarSign, color: 'bg-estado-aprobado', href: '/admin/cotizaciones' },
    { label: 'Por Cobrar', value: stats?.montoPendiente ? `S/ ${stats.montoPendiente.toLocaleString()}` : 'S/ 0', icon: TrendingUp, color: 'bg-distribuidor', href: '/admin/cobranza' },
  ];

  return (
    <>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {statCards.map((stat) => (
              <Link key={stat.label} href={stat.href} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Indicadores de la tesis</h2>
            <p className="text-sm text-gray-500 mb-4">
              Tiempo, eficacia y rendimiento de las cotizaciones
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {indicadoresTesis.map((ind) => (
                <div key={ind.label} className="rounded-xl border border-gray-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{ind.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{ind.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${ind.color}`}>
                      <ind.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/admin/productos" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <Package className="h-8 w-8 text-brand-ink mb-2" />
                <p className="font-medium text-gray-900">Gestionar Productos</p>
                <p className="text-sm text-gray-500 mt-1">Inventario, precios, importación</p>
              </Link>
              <Link href="/admin/cotizaciones/crear?nueva=1" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <FileText className="h-8 w-8 text-brand-ink mb-2" />
                <p className="font-medium text-gray-900">Nueva Cotización</p>
                <p className="text-sm text-gray-500 mt-1">Crear cotización para cliente</p>
              </Link>
              <Link href="/admin/cobranza" className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <DollarSign className="h-8 w-8 text-brand-ink mb-2" />
                <p className="font-medium text-gray-900">Cobranza</p>
                <p className="text-sm text-gray-500 mt-1">Registrar pagos de cotizaciones</p>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
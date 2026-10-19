'use client';

import { TrendingUp, Sparkles, FileText, AlertTriangle } from 'lucide-react';
import type { DetalleReporte } from '@/features/reportes/types';

interface KPICardsProps {
  kpis: DetalleReporte['kpis'];
  cotizaciones: DetalleReporte['cotizaciones'];
}

export function KPICards({ kpis, cotizaciones }: KPICardsProps) {
  const kpiCards = [
    { label: 'Tasa de conversión', value: `${kpis.tasaConversion}%`, icon: TrendingUp, color: 'bg-estado-aprobado' },
    { label: 'Efectividad IA', value: `${kpis.efectividadIA}%`, icon: Sparkles, color: 'bg-accent-primary' },
    { label: 'Cotizaciones totales', value: cotizaciones.total, icon: FileText, color: 'bg-estado-enviado' },
    { label: 'Alertas de stock', value: kpis.alertasStockActivas, icon: AlertTriangle, color: 'bg-danger' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((kpi) => (
        <div key={kpi.label} className="bg-white rounded-xl border border-zinc-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">{kpi.value}</p>
            </div>
            <div className={`p-3 rounded-xl ${kpi.color}`}>
              <kpi.icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
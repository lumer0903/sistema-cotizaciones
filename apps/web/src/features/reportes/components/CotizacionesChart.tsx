'use client';

import { Badge, FilterCard, ESTADO_BADGE } from '@/components/ui';
import type { DetalleReporte } from '@/features/reportes/types';

interface CotizacionesChartProps {
  cotizaciones: DetalleReporte['cotizaciones'];
  itemsAprobados: DetalleReporte['itemsAprobados'];
}

export function CotizacionesChart({ cotizaciones, itemsAprobados }: CotizacionesChartProps) {
  const estadosCotizacion: Array<{ key: keyof typeof cotizaciones; label: string }> = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'enviada', label: 'Enviada' },
    { key: 'aprobada', label: 'Aprobada' },
    { key: 'rechazada', label: 'Rechazada' },
  ];

  return (
    <FilterCard>
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Cotizaciones por estado</h2>
      <div className="space-y-3">
        {estadosCotizacion.map(({ key, label }) => {
          const value = cotizaciones[key];
          const pct = cotizaciones.total > 0 ? Math.round((value / cotizaciones.total) * 100) : 0;
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <Badge variant={ESTADO_BADGE[key] ?? 'neutral'} size="estado">{label}</Badge>
              <div className="flex-1 mx-3">
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold text-zinc-700 w-16 text-right">{value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-zinc-500">Items aprobados</p>
          <p className="text-xl font-bold text-zinc-900">{itemsAprobados.total}</p>
        </div>
        <div>
          <p className="text-zinc-500">Sugeridos por IA</p>
          <p className="text-xl font-bold text-zinc-900">{itemsAprobados.sugeridosIA}</p>
        </div>
      </div>
    </FilterCard>
  );
}

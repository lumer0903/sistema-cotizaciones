'use client';

import { useEffect, useState } from 'react';
import { showToast } from '@/lib/toast';
import type { DetalleReporte } from '@/features/reportes/types';
import { fetchReporteDetalle } from '@/features/reportes/api/reportes';
import { KPICards } from './KPICards';
import { CotizacionesChart } from './CotizacionesChart';
import { CotizadoVsVendido } from './CotizadoVsVendido';
import { AlertasStockTable } from './AlertasStockTable';

export function ReportesDashboard() {
  const [detalle, setDetalle] = useState<DetalleReporte | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReporte = async () => {
      try {
        const data = await fetchReporteDetalle();
        setDetalle(data);
      } catch (error) {
        showToast.error(error instanceof Error ? error.message : 'No se pudo cargar el reporte');
      } finally {
        setLoading(false);
      }
    };
    fetchReporte();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-zinc-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!detalle) {
    return (
      <div>
        <p className="text-zinc-600">No se pudieron cargar los reportes. Verifica que la API esté disponible.</p>
      </div>
    );
  }

  const { kpis, cotizaciones, itemsAprobados, alertasStock, graficos } = detalle;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Reportes</h1>
      <KPICards kpis={kpis} cotizaciones={cotizaciones} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CotizacionesChart cotizaciones={cotizaciones} itemsAprobados={itemsAprobados} />
        <CotizadoVsVendido data={graficos.cotizadoVsVendido} />
      </div>

      <AlertasStockTable alertasStock={alertasStock} />
    </div>
  );
}

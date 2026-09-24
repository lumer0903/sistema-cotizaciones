'use client';

import { useEffect, useState } from 'react';
import { BarChart3, FileText, Package, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, FilterCard, ESTADO_BADGE } from '@/components/ui';
import { showToast } from '@/lib/toast';

interface DetalleReporte {
  kpis: {
    tasaConversion: number;
    efectividadIA: number;
    tiempoPromedioCotizacion: number;
    alertasStockActivas: number;
  };
  cotizaciones: {
    total: number;
    borrador: number;
    enviada: number;
    aprobada: number;
    rechazada: number;
  };
  itemsAprobados: {
    total: number;
    sugeridosIA: number;
  };
  alertasStock: Array<{
    id_alerta: number;
    codigo: string;
    descripcion: string;
    almacen_nombre: string;
    stock_actual: number;
    stock_minimo: number;
    estado: string;
  }>;
  graficos: {
    cotizadoVsVendido: Array<{ mes: string; cotizado: number; vendido: number }>;
    alertasPorAlmacen: Array<{ almacen: string; cantidad: number }>;
  };
}

export default function ReportesPage() {
  const [detalle, setDetalle] = useState<DetalleReporte | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReporte = async () => {
      try {
        const data = await apiClient<{ success: boolean; data: DetalleReporte }>('/dashboard/detalle');
        setDetalle(data.data);
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
      <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!detalle) {
    return (
      <div className="p-6">
        <p className="text-gray-600">No se pudieron cargar los reportes. Verifica que la API esté disponible.</p>
      </div>
    );
  }

  const { kpis, cotizaciones, itemsAprobados, alertasStock, graficos } = detalle;

  const kpiCards = [
    { label: 'Tasa de conversión', value: `${kpis.tasaConversion}%`, icon: TrendingUp, color: 'bg-estado-aprobado' },
    { label: 'Efectividad IA', value: `${kpis.efectividadIA}%`, icon: Sparkles, color: 'bg-brand-primary' },
    { label: 'Cotizaciones totales', value: cotizaciones.total, icon: FileText, color: 'bg-estado-enviado' },
    { label: 'Alertas de stock', value: kpis.alertasStockActivas, icon: AlertTriangle, color: 'bg-danger' },
  ];

  const estadosCotizacion: Array<{ key: keyof typeof cotizaciones; label: string }> = [
    { key: 'borrador', label: 'Borrador' },
    { key: 'enviada', label: 'Enviada' },
    { key: 'aprobada', label: 'Aprobada' },
    { key: 'rechazada', label: 'Rechazada' },
  ];

  return (
    <div className="p-6 space-y-6">

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${kpi.color}`}>
                <kpi.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FilterCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cotizaciones por estado</h2>
          <div className="space-y-3">
            {estadosCotizacion.map(({ key, label }) => {
              const value = cotizaciones[key];
              const pct = cotizaciones.total > 0 ? Math.round((value / cotizaciones.total) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Badge variant={ESTADO_BADGE[key] ?? 'neutral'}>{label}</Badge>
                  <div className="flex-1 mx-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-16 text-right">{value} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Items aprobados</p>
              <p className="text-xl font-bold text-gray-900">{itemsAprobados.total}</p>
            </div>
            <div>
              <p className="text-gray-500">Sugeridos por IA</p>
              <p className="text-xl font-bold text-gray-900">{itemsAprobados.sugeridosIA}</p>
            </div>
          </div>
        </FilterCard>

        <FilterCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cotizado vs vendido (6 meses)</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead>Cotizado</TableHead>
                <TableHead>Vendido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {graficos.cotizadoVsVendido.map((row) => (
                <TableRow key={row.mes}>
                  <TableCell>{row.mes}</TableCell>
                  <TableCell>{row.cotizado}</TableCell>
                  <TableCell>{row.vendido}</TableCell>
                </TableRow>
              ))}
              {graficos.cotizadoVsVendido.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500">
                    Sin datos en los últimos 6 meses
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </FilterCard>
      </div>

      <FilterCard>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-brand-primary" />
          <h2 className="text-lg font-semibold text-gray-900">Alertas de stock activas</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Almacén</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Mínimo</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertasStock.map((alerta) => (
              <TableRow key={alerta.id_alerta}>
                <TableCell className="font-mono text-xs">{alerta.codigo}</TableCell>
                <TableCell>{alerta.descripcion}</TableCell>
                <TableCell>{alerta.almacen_nombre}</TableCell>
                <TableCell>{alerta.stock_actual}</TableCell>
                <TableCell>{alerta.stock_minimo}</TableCell>
                <TableCell>
                  <Badge variant={alerta.estado === 'activa' ? 'danger' : 'neutral'}>{alerta.estado}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {alertasStock.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500">
                  No hay alertas de stock activas
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </FilterCard>
    </div>
  );
}

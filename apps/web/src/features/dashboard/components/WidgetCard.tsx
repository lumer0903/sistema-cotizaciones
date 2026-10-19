'use client';

import type { WidgetConfig, ChartType, DashboardView } from '../store/useDashboardStore';
import type { DashboardGraficos, AlertaStockBajo } from '../types/dashboard';
import {
  CotizadoVsVendidoChart,
  CotizadoVsVendidoArea,
  EstadoDonutChart,
  EstadoBarChart,
  AlertasPorAlmacenChart,
  VentasPorTipoChart,
  CompactTable,
} from './charts/DashboardCharts';
import { formatCode } from '@/lib/formatters';
import { cn } from '@/lib/cn';

const ROLE_ACCENT: Record<DashboardView, { accent: string; gradient: string }> = {
  admin: { accent: 'var(--color-brand-primary)', gradient: 'from-amber-500 to-amber-600' },
  vendedor: { accent: 'var(--color-vendedor-primary)', gradient: 'from-red-700 to-red-800' },
};

const CHART_TYPE_LABELS: Record<ChartType, string> = {
  bar: 'Barras',
  line: 'Área',
  donut: 'Dona',
  table: 'Tabla',
};

interface WidgetCardProps {
  widget: WidgetConfig;
  graficos?: DashboardGraficos;
  stockBajo?: AlertaStockBajo[];
  view: DashboardView;
  onOpenCustomizer: () => void;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-[300px] flex items-center justify-center">
      <p className="text-center text-sm text-zinc-500 px-4">{message}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full animate-pulse rounded-xl bg-zinc-100" aria-hidden="true" />
  );
}

export function WidgetCard({ widget, graficos, stockBajo, view, onOpenCustomizer: _onOpenCustomizer }: WidgetCardProps) {
  const { accent } = ROLE_ACCENT[view];

  return (
    <section
      className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden"
      aria-label={widget.title}
      style={{ minHeight: '420px' }}
    >
      <header className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-3 bg-zinc-50/50">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-zinc-900 truncate">{widget.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 capitalize">
            {CHART_TYPE_LABELS[widget.chartType]}
          </p>
        </div>
      </header>

      <div className="p-5 min-h-[320px]" aria-live="polite">
        {renderWidget(widget, graficos, stockBajo, accent)}
      </div>
    </section>
  );
}

function renderWidget(
  widget: WidgetConfig,
  graficos?: DashboardGraficos,
  stockBajo?: AlertaStockBajo[],
  accent = 'var(--color-brand-primary)'
) {
  // Tabla de stock bajo (sólo type table)
  if (widget.id === 'stockBajo') {
    if (!stockBajo?.length) return <EmptyState message="Sin alertas de stock bajo." />;
    return (
      <CompactTable
        headers={['Código', 'Producto', 'Almacén', 'Stock', 'Mínimo', 'Estado']}
        rows={stockBajo.map((a) => [
          formatCode(a.codigo),
          <span key={a.id_alerta} className="line-clamp-1 max-w-[200px]" title={a.descripcion}>
            {a.descripcion}
          </span>,
          a.almacen_nombre,
          <span key={`s-${a.id_alerta}`} className="font-bold tnum text-red-700">
            {a.stock_actual}
          </span>,
          <span key={`m-${a.id_alerta}`} className="tnum text-zinc-600">
            {a.stock_minimo}
          </span>,
          <span
            key={`e-${a.id_alerta}`}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
              a.stock_actual === 0
                ? 'bg-red-50 text-red-700'
                : a.stock_actual <= a.stock_minimo
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700',
            )}
          >
            {a.stock_actual === 0 ? 'Agotado' : a.stock_actual <= a.stock_minimo ? 'Crítico' : 'Bajo'}
          </span>,
        ])}
      />
    );
  }

  if (!graficos) return <ChartSkeleton />;

  // Cotizado vs Vendido
  if (widget.id === 'cotizadoVsVendido') {
    if (!graficos.cotizadoVsVendido.length) return <EmptyState message="Sin datos en el rango seleccionado." />;
    return (
      <div className="h-[320px]">
        {widget.chartType === 'line' && <CotizadoVsVendidoArea data={graficos.cotizadoVsVendido} accent={accent} />}
        {widget.chartType === 'table' && <CotizadoVsVendidoTable data={graficos.cotizadoVsVendido} />}
        {widget.chartType === 'bar' && <CotizadoVsVendidoChart data={graficos.cotizadoVsVendido} accent={accent} />}
        {widget.chartType === 'donut' && <CotizadoVsVendidoTable data={graficos.cotizadoVsVendido} />}
      </div>
    );
  }

  // Cotizaciones por estado
  if (widget.id === 'cotizacionesPorEstado') {
    if (!graficos.cotizacionesPorEstado.length) return <EmptyState message="Sin cotizaciones registradas." />;
    if (widget.chartType === 'table') {
      return (
        <div className="h-[320px]">
          <CompactTable
            headers={['Estado', 'Cantidad', 'Porcentaje']}
            rows={graficos.cotizacionesPorEstado.map((e) => {
              const total = graficos.cotizacionesPorEstado.reduce((s, x) => s + x.cantidad, 0);
              return [
                <span key={e.estado} className="capitalize">{e.estado}</span>,
                e.cantidad,
                `${total > 0 ? ((e.cantidad / total) * 100).toFixed(1) : 0}%`,
              ];
            })}
          />
        </div>
      );
    }
    if (widget.chartType === 'bar' || widget.chartType === 'line') {
      return (
        <div className="h-[320px]">
          <EstadoBarChart data={graficos.cotizacionesPorEstado} />
        </div>
      );
    }
    return (
      <div className="h-[320px]">
        <EstadoDonutChart data={graficos.cotizacionesPorEstado} />
      </div>
    );
  }

  // Ventas por tipo (Mayorista vs Minorista) - nuevo gráfico
  if (widget.id === 'ventasPorTipo') {
    if (!graficos.cotizacionesPorEstado.length) return <EmptyState message="Sin datos de ventas por tipo." />;
    return (
      <div className="h-[320px]">
        <VentasPorTipoChart data={graficos.cotizadoVsVendido} />
      </div>
    );
  }

  // Alertas por almacén
  if (widget.id === 'alertasPorAlmacen') {
    if (!graficos.alertasPorAlmacen.length) return <EmptyState message="Sin alertas activas." />;
    return (
      <div className="h-[320px]">
        <AlertasPorAlmacenChart data={graficos.alertasPorAlmacen} accent={accent} />
      </div>
    );
  }

  return <EmptyState message="Widget sin datos disponible." />;
}

function CotizadoVsVendidoTable({ data }: { data: Array<{ mes: string; vendido: number }> }) {
  const rows = data.filter((d) => d.vendido > 0);
  if (!rows.length) return <EmptyState message="Sin ventas en el rango." />;
  return (
    <CompactTable
      headers={['Mes', 'Vendido']}
      rows={rows.map((d) => [
        d.mes,
        <span key={d.mes} className="font-bold tnum">
          S/ {d.vendido.toLocaleString('es-PE')}
        </span>,
      ])}
    />
  );
}
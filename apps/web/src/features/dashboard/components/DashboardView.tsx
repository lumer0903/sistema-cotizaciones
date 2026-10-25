'use client';

import { Button } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { useDashboardData } from '../hooks/useDashboardData';
import {
  useDashboardStore,
  type ChartType,
  type DashboardView as DashboardViewType,
} from '../store/useDashboardStore';
import { KPICards, IndicadoresTesis } from './KPICards';
import { DashboardCustomizer } from './DashboardCustomizer';
import { WidgetCard } from './WidgetCard';
import { DashboardFiltersBar } from './DashboardFiltersBar';

export function DashboardView() {
  const { isAdmin, isGerente } = usePermissions();
  const {
    isCustomizing,
    adminWidgets,
    vendedorWidgets,
    filters,
    setCustomizing,
    toggleWidget,
    setWidgetChartType,
    resetWidgets,
    setFilters,
  } = useDashboardStore();

  const { kpis, graficos, stockBajo, isLoading, isError, refetchAll } = useDashboardData(filters);

  // Vista forzada por rol. El Admin/Gerente usa el filtro de "Vendedor" en la barra superior.
  const view: DashboardViewType = isAdmin || isGerente ? 'admin' : 'vendedor';
  const widgets = view === 'admin' ? adminWidgets : vendedorWidgets;
  const activeWidgets = widgets.filter((w) => w.isActive);

  const cotizacionesPorEstadoTotal = graficos.data?.cotizacionesPorEstado?.reduce(
    (s, e) => s + e.cantidad,
    0
  );

  const isAdminOrGerente = isAdmin || isGerente;

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>

      {/* Filtros globales */}
      <div className="mb-6">
        <DashboardFiltersBar
          filters={filters}
          onChange={setFilters}
          isAdmin={isAdminOrGerente}
        />
      </div>

      {/* Error banner */}
      {isError && (
        <div
          role="alert"
          className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between"
        >
          <span>No se pudieron cargar las métricas del dashboard.</span>
          <Button variant="outline" size="sm" onClick={() => void refetchAll()} className="ml-4 underline">
            Reintentar
          </Button>
        </div>
      )}

      {/* KPIs */}
      <KPICards
        kpis={kpis.data}
        cotizacionesPorEstadoTotal={cotizacionesPorEstadoTotal}
        stockBajo={stockBajo.data}
        view={view}
        loading={isLoading}
      />

      {/* Widgets activos */}
      {activeWidgets.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2" aria-label="Widgets del dashboard">
          {activeWidgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              graficos={graficos.data}
              stockBajo={stockBajo.data}
              view={view}
              onOpenCustomizer={() => setCustomizing(true)}
            />
          ))}
        </div>
      )}

      {/* Sin widgets activos */}
      {activeWidgets.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center">
          <p className="text-sm font-semibold text-zinc-700">No hay widgets activos</p>
          <p className="mt-1 text-xs text-brand-options">
            Personaliza tu dashboard para agregar indicadores y gráficos.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setCustomizing(true)}>
            Personalizar Dashboard
          </Button>
        </div>
      )}

      {/* Indicadores de tesis (solo Admin) — al final de la página */}
      {view === 'admin' && !isLoading && kpis.data && (
        <div className="mt-6">
          <IndicadoresTesis kpis={kpis.data} view={view} />
        </div>
      )}

      {/* Modal de personalización */}
      <DashboardCustomizer
        open={isCustomizing}
        onClose={() => setCustomizing(false)}
        view={view}
        widgets={widgets}
        onToggleWidget={toggleWidget}
        onChartTypeChange={(v, id, type: ChartType) => setWidgetChartType(v, id, type)}
        onReset={resetWidgets}
      />
    </>
  );
}
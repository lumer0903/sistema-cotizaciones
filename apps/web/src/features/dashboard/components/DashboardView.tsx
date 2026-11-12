'use client';

import React, { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => { };
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import * as XLSX from 'xlsx';
import { SlidersHorizontal, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { useDashboardData } from '../hooks/useDashboardData';
import { useDashboardStore } from '../store/useDashboardStore';
import { KPICards, IndicadoresTesis } from './KPICards';
import { DashboardCustomizer } from './DashboardCustomizer';
import { SortableWidgetCard } from './WidgetCard';
import {
  MOCK_VENTAS_CANAL,
  MOCK_TOP_PRODUCTOS,
  MOCK_STOCK_BAJO,
} from './charts/DashboardCharts';
import type { ChartType } from '../types/dashboard';

export function DashboardView() {
  const mounted = useMounted();

  const {
    isCustomizing,
    kpis: kpiConfigs,
    widgets,
    setCustomizing,
    setKpis,
    toggleKpi,
    setKpiSize,
    setWidgets,
    toggleWidget,
    setWidgetChartType,
    setWidgetSize,
    resetLayout,
  } = useDashboardStore();

  const { kpis, graficos, stockBajo, isLoading, isError, refetchAll } = useDashboardData();

  // Sensores para arrastre suave con prevención de clicks accidentales
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeKpis = kpiConfigs.filter((k) => k.isActive);
  const activeWidgets = widgets.filter((w) => w.isActive);

  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = kpiConfigs.findIndex((k) => k.id === active.id);
      const newIndex = kpiConfigs.findIndex((k) => k.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setKpis(arrayMove(kpiConfigs, oldIndex, newIndex));
      }
    }
  };

  const handleWidgetDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.id === active.id);
      const newIndex = widgets.findIndex((w) => w.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setWidgets(arrayMove(widgets, oldIndex, newIndex));
      }
    }
  };

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Hoja KPIs
    const cotizacionesTotal = graficos.data?.cotizacionesPorEstado?.reduce((s, e) => s + e.cantidad, 0) ?? 44;
    const stockItems = stockBajo.data?.length ? stockBajo.data : MOCK_STOCK_BAJO;

    const kpiRows = activeKpis.map((kpi) => {
      let valor = '';
      let detalle = '';
      switch (kpi.id) {
        case 'totalVentas':
          valor = 'S/ 72,387';
          detalle = '+12.4% vs. mes anterior';
          break;
        case 'ventasCanal':
          valor = 'Distribuidor: S/ 48,500 | Tienda: S/ 23,887';
          detalle = 'Distribuidor 67% · Tienda 33%';
          break;
        case 'topProducto':
          valor = 'FUG-10 · Plato Porcelana 33cm';
          detalle = '340 unid. · S/ 16,524';
          break;
        case 'porCobrar':
          valor = 'S/ 38,286';
          detalle = 'S/ 11,400 vencido · S/ 26,886 vigente';
          break;
        case 'cotizacionesConversion':
          valor = `${cotizacionesTotal} documentos`;
          detalle = `${kpis.data?.tasaConversion ?? 68}% tasa de cierre`;
          break;
        case 'stockBajo':
          valor = `${stockItems.length} productos`;
          detalle = 'Requieren reposición';
          break;
        default:
          valor = 'N/A';
          detalle = '';
      }
      return {
        Indicador: kpi.title,
        Valor: valor,
        Detalle: detalle,
      };
    });
    const wsKpis = XLSX.utils.json_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, wsKpis, 'KPIs');

    // 2. Hoja Ventas por Canal
    const canalRows = (graficos.data?.ventasPorCanal ?? MOCK_VENTAS_CANAL).map((c) => ({
      Canal: c.canal,
      'Monto (S/)': c.monto,
      'Participación (%)': `${c.porcentaje}%`,
    }));
    const wsCanal = XLSX.utils.json_to_sheet(canalRows);
    XLSX.utils.book_append_sheet(wb, wsCanal, 'Ventas por Canal');

    // 3. Hoja Top Productos
    const topRows = (graficos.data?.topProductos ?? MOCK_TOP_PRODUCTOS).map((p) => ({
      Código: p.codigo,
      Producto: p.nombre,
      Unidades: p.unidades,
      'Total (S/)': p.total,
    }));
    const wsTop = XLSX.utils.json_to_sheet(topRows);
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos');

    // 4. Hoja Stock Bajo
    const stockRows = stockItems.map((s) => ({
      Código: s.codigo,
      Producto: s.descripcion,
      Almacén: s.almacen_nombre,
      'Stock Actual': s.stock_actual,
      'Stock Mínimo': s.stock_minimo,
      Estado:
        s.stock_actual === 0
          ? 'Agotado'
          : s.stock_actual <= s.stock_minimo / 2
            ? 'Crítico'
            : 'Bajo',
    }));
    const wsStock = XLSX.utils.json_to_sheet(stockRows);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock Bajo');

    XLSX.writeFile(wb, 'reporte-dashboard.xlsx');
  };

  const cotizacionesPorEstadoTotal = graficos.data?.cotizacionesPorEstado?.reduce(
    (s, e) => s + e.cantidad,
    0
  );

  return (
    <div className="pb-10">
      <h1 className="sr-only">Dashboard</h1>

      {/* Barra de herramientas superior (alineada a la derecha) */}
      <div className="flex items-center justify-end gap-2.5 mb-6">
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="h-10 px-3 rounded-md bg-white border border-stone-200 text-xs font-medium text-neutral-900 hover:bg-neutral-100 inline-flex items-center gap-2 transition-colors cursor-pointer focus:outline-none"
        >
          <SlidersHorizontal className="size-4 strokeWidth={1.5} text-neutral-700" />
          <span>Personalizar</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadExcel}
          className="h-10 px-3.5 rounded-md bg-orange-700 hover:bg-red-500 active:bg-orange-800 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer focus:outline-none shadow-xs"
        >
          <Download className="size-4 strokeWidth={1.5} text-white" />
          <span>Descargar reporte</span>
        </button>
      </div>

      {/* Error banner */}
      {isError && (
        <div
          role="alert"
          className="mb-6 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between"
        >
          <span>No se pudieron cargar todas las métricas en tiempo real. Mostrando datos de respaldo.</span>
          <Button variant="outline" size="sm" onClick={() => void refetchAll()} className="ml-4 underline">
            Reintentar
          </Button>
        </div>
      )}

      {/* KPIs arrastrables y personalizables */}
      {mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleKpiDragEnd}
        >
          <SortableContext
            items={activeKpis.map((k) => k.id)}
            strategy={rectSortingStrategy}
          >
            <KPICards
              kpis={kpis.data}
              cotizacionesPorEstadoTotal={cotizacionesPorEstadoTotal}
              stockBajo={stockBajo.data}
              kpiConfigs={kpiConfigs}
              loading={isLoading}
              onResizeKpi={setKpiSize}
            />
          </SortableContext>
        </DndContext>
      ) : (
        <KPICards
          kpis={kpis.data}
          cotizacionesPorEstadoTotal={cotizacionesPorEstadoTotal}
          stockBajo={stockBajo.data}
          kpiConfigs={kpiConfigs}
          loading={isLoading}
          onResizeKpi={setKpiSize}
        />
      )}

      {/* Widgets arrastrables y personalizables */}
      {mounted && activeWidgets.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleWidgetDragEnd}
        >
          <SortableContext
            items={activeWidgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 auto-rows-[132px] grid-flow-dense gap-4"
              aria-label="Widgets del dashboard"
            >
              {activeWidgets.map((widget) => (
                <SortableWidgetCard
                  key={widget.id}
                  widget={widget}
                  graficos={graficos.data}
                  stockBajo={stockBajo.data}
                  onChartTypeChange={(_id, type: ChartType) =>
                    setWidgetChartType('admin', widget.id, type)
                  }
                  onResizeWidget={setWidgetSize}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : activeWidgets.length > 0 ? (
        <div
          className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 auto-rows-[132px] grid-flow-dense gap-4"
          aria-label="Widgets del dashboard"
        >
          {activeWidgets.map((widget) => (
            <SortableWidgetCard
              key={widget.id}
              widget={widget}
              graficos={graficos.data}
              stockBajo={stockBajo.data}
              onChartTypeChange={(_id, type: ChartType) =>
                setWidgetChartType('admin', widget.id, type)
              }
              onResizeWidget={setWidgetSize}
            />
          ))}
        </div>
      ) : null}

      {/* Sin widgets activos */}
      {activeWidgets.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center my-6">
          <p className="text-sm font-semibold text-neutral-800">No hay widgets activos</p>
          <p className="mt-1 text-xs text-neutral-500">
            Personaliza tu dashboard para seleccionar y ordenar los gráficos e indicadores que necesitas.
          </p>
          <Button variant="primary" size="sm" className="mt-4 text-xs" onClick={() => setCustomizing(true)}>
            Personalizar Dashboard
          </Button>
        </div>
      )}

      {/* Indicadores clave al final de la página */}
      {!isLoading && kpis.data && (
        <div className="mt-6">
          <IndicadoresTesis kpis={kpis.data} />
        </div>
      )}

      {/* Modal / Popover de personalización */}
      <DashboardCustomizer
        open={isCustomizing}
        onClose={() => setCustomizing(false)}
        kpis={kpiConfigs}
        widgets={widgets}
        onToggleKpi={toggleKpi}
        onToggleWidget={(id) => toggleWidget('admin', id)}
        onReset={resetLayout}
      />
    </div>
  );
}

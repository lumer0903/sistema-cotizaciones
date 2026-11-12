'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChartType,
  DashboardView,
  KpiConfig,
  WidgetConfig,
  ColSpan,
  RowSpan,
} from '../types/dashboard';

export type { ChartType, DashboardView, KpiConfig, WidgetConfig, ColSpan, RowSpan };

export interface DashboardFilterState {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: number;
  idAlmacen?: number;
}

export const DEFAULT_KPIS: KpiConfig[] = [
  { id: 'totalVentas', title: 'Total Ventas del Mes', isActive: true, colSpan: 4, rowSpan: 1 },
  { id: 'ventasCanal', title: 'Ventas por Canal (Distribuidor vs. Tienda)', isActive: true, colSpan: 4, rowSpan: 1 },
  { id: 'topProducto', title: 'Producto Más Vendido', isActive: true, colSpan: 4, rowSpan: 1 },
  { id: 'porCobrar', title: 'Total por Cobrar', isActive: true, colSpan: 4, rowSpan: 1 },
  { id: 'cotizacionesConversion', title: 'Cotizaciones y Conversión', isActive: true, colSpan: 4, rowSpan: 1 },
  { id: 'stockBajo', title: 'Productos con Stock Bajo', isActive: true, colSpan: 4, rowSpan: 1 },
];

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'cotizadoVsVendido', title: 'Cotizado vs. Vendido', chartType: 'bar', isActive: true, colSpan: 6, rowSpan: 2 },
  { id: 'ventasCanal', title: 'Ventas por Canal: Distribuidor vs. Tienda', chartType: 'donut', isActive: true, colSpan: 6, rowSpan: 2 },
  { id: 'topProductos', title: 'Top 5 Productos Más Vendidos', chartType: 'bar', isActive: true, colSpan: 6, rowSpan: 2 },
  { id: 'cotizacionesPorEstado', title: 'Cotizaciones por Estado', chartType: 'donut', isActive: true, colSpan: 6, rowSpan: 2 },
  { id: 'stockBajo', title: 'Productos con Stock Bajo', chartType: 'table', isActive: true, colSpan: 6, rowSpan: 2 },
];

interface DashboardState {
  selectedView: DashboardView;
  isCustomizing: boolean;
  kpis: KpiConfig[];
  widgets: WidgetConfig[];
  adminWidgets: WidgetConfig[];
  vendedorWidgets: WidgetConfig[];
  filters: DashboardFilterState;
  setSelectedView: (view: DashboardView) => void;
  setCustomizing: (open: boolean) => void;
  setKpis: (kpis: KpiConfig[]) => void;
  toggleKpi: (id: string) => void;
  setKpiSize: (id: string, colSpan: ColSpan, rowSpan: RowSpan) => void;
  setWidgets: (widgets: WidgetConfig[]) => void;
  toggleWidget: (view: DashboardView, id: string) => void;
  setWidgetChartType: (view: DashboardView, id: string, type: ChartType) => void;
  setWidgetSize: (id: string, colSpan: ColSpan, rowSpan: RowSpan) => void;
  resetLayout: () => void;
  resetWidgets: () => void;
  setFilters: (filters: DashboardFilterState) => void;
  clearFilters: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedView: 'admin',
      isCustomizing: false,
      kpis: DEFAULT_KPIS,
      widgets: DEFAULT_WIDGETS,
      adminWidgets: DEFAULT_WIDGETS,
      vendedorWidgets: DEFAULT_WIDGETS,
      filters: {},

      setSelectedView: (view) => set({ selectedView: view }),
      setCustomizing: (open) => set({ isCustomizing: open }),

      setKpis: (kpis) => set({ kpis }),
      toggleKpi: (id) =>
        set((state) => ({
          kpis: state.kpis.map((k) => (k.id === id ? { ...k, isActive: !k.isActive } : k)),
        })),
      setKpiSize: (id, colSpan, rowSpan) =>
        set((state) => ({
          kpis: state.kpis.map((k) => (k.id === id ? { ...k, colSpan, rowSpan } : k)),
        })),

      setWidgets: (widgets) =>
        set({
          widgets,
          adminWidgets: widgets,
          vendedorWidgets: widgets,
        }),

      toggleWidget: (_view, id) =>
        set((state) => {
          const updated = state.widgets.map((w) =>
            w.id === id ? { ...w, isActive: !w.isActive } : w
          );
          return {
            widgets: updated,
            adminWidgets: updated,
            vendedorWidgets: updated,
          };
        }),

      setWidgetChartType: (_view, id, chartType) =>
        set((state) => {
          const updated = state.widgets.map((w) =>
            w.id === id ? { ...w, chartType } : w
          );
          return {
            widgets: updated,
            adminWidgets: updated,
            vendedorWidgets: updated,
          };
        }),

      setWidgetSize: (id, colSpan, rowSpan) =>
        set((state) => {
          const updated = state.widgets.map((w) =>
            w.id === id ? { ...w, colSpan, rowSpan } : w
          );
          return {
            widgets: updated,
            adminWidgets: updated,
            vendedorWidgets: updated,
          };
        }),

      resetLayout: () =>
        set({
          kpis: DEFAULT_KPIS,
          widgets: DEFAULT_WIDGETS,
          adminWidgets: DEFAULT_WIDGETS,
          vendedorWidgets: DEFAULT_WIDGETS,
        }),

      resetWidgets: () =>
        set({
          kpis: DEFAULT_KPIS,
          widgets: DEFAULT_WIDGETS,
          adminWidgets: DEFAULT_WIDGETS,
          vendedorWidgets: DEFAULT_WIDGETS,
        }),

      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: {} }),
    }),
    {
      name: 'dashboard_layout_v2',
      partialize: (state) => ({
        selectedView: state.selectedView,
        kpis: state.kpis,
        widgets: state.widgets,
      }),
    }
  )
);

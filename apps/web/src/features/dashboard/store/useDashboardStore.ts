'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Tipos de representación visual disponibles por widget. */
export type ChartType = 'bar' | 'line' | 'donut' | 'table';

export interface WidgetConfig {
  id: string;
  title: string;
  chartType: ChartType;
  isActive: boolean;
}

export type DashboardView = 'admin' | 'vendedor';

/** Filtros globales del dashboard (compartidos con `DashboardFilters` del hook). */
export interface DashboardFilterState {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: number;
  idAlmacen?: number;
}

const FILTROS_VACIOS: DashboardFilterState = {};

/** Widgets por defecto para la vista Administrador. */
export const ADMIN_WIDGETS: WidgetConfig[] = [
  { id: 'cotizadoVsVendido', title: 'Cotizado vs. Vendido', chartType: 'bar', isActive: true },
  { id: 'cotizacionesPorEstado', title: 'Cotizaciones por Estado', chartType: 'donut', isActive: true },
  { id: 'alertasPorAlmacen', title: 'Alertas de Stock por Almacén', chartType: 'bar', isActive: true },
  { id: 'stockBajo', title: 'Productos con Stock Bajo', chartType: 'table', isActive: true },
];

/** Widgets por defecto para la vista Vendedor. */
export const VENDEDOR_WIDGETS: WidgetConfig[] = [
  { id: 'cotizadoVsVendido', title: 'Mi Cotizado vs. Vendido', chartType: 'bar', isActive: true },
  { id: 'cotizacionesPorEstado', title: 'Mis Cotizaciones por Estado', chartType: 'donut', isActive: true },
];

interface DashboardState {
  selectedView: DashboardView;
  isCustomizing: boolean;
  adminWidgets: WidgetConfig[];
  vendedorWidgets: WidgetConfig[];
  filters: DashboardFilterState;
  setSelectedView: (view: DashboardView) => void;
  setCustomizing: (open: boolean) => void;
  toggleWidget: (view: DashboardView, id: string) => void;
  setWidgetChartType: (view: DashboardView, id: string, type: ChartType) => void;
  resetWidgets: () => void;
  setFilters: (filters: DashboardFilterState) => void;
  clearFilters: () => void;
}

/**
 * Store de configuración del dashboard personalizable.
 * Persiste en `localStorage` (clave `dashboard-layout`) para recordar el layout
 * entre sesiones. El toggle Admin/Vendedor sólo es operable por admin; para
 * vendedores la vista queda fija en 'vendedor' (se gestiona en el componente).
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      selectedView: 'admin',
      isCustomizing: false,
      adminWidgets: ADMIN_WIDGETS,
      vendedorWidgets: VENDEDOR_WIDGETS,
      filters: FILTROS_VACIOS,

      setSelectedView: (view) => set({ selectedView: view }),
      setCustomizing: (open) => set({ isCustomizing: open }),

      setFilters: (filters) => set({ filters }),
      clearFilters: () => set({ filters: FILTROS_VACIOS }),

      toggleWidget: (view, id) =>
        set((state) => ({
          [view === 'admin' ? 'adminWidgets' : 'vendedorWidgets']: (
            view === 'admin' ? state.adminWidgets : state.vendedorWidgets
          ).map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w)),
        })),

      setWidgetChartType: (view, id, chartType) =>
        set((state) => ({
          [view === 'admin' ? 'adminWidgets' : 'vendedorWidgets']: (
            view === 'admin' ? state.adminWidgets : state.vendedorWidgets
          ).map((w) => (w.id === id ? { ...w, chartType } : w)),
        })),

      resetWidgets: () =>
        set({
          adminWidgets: ADMIN_WIDGETS,
          vendedorWidgets: VENDEDOR_WIDGETS,
        }),
    }),
    {
      name: 'dashboard-layout',
      partialize: (state) => ({
        selectedView: state.selectedView,
        adminWidgets: state.adminWidgets,
        vendedorWidgets: state.vendedorWidgets,
      }),
    }
  )
);

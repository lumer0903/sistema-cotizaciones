import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore, ADMIN_WIDGETS, VENDEDOR_WIDGETS } from './useDashboardStore';

// Zustand persist usa localStorage (jsdom lo provee)
beforeEach(() => {
  localStorage.clear();
  useDashboardStore.setState({
    selectedView: 'admin',
    isCustomizing: false,
    adminWidgets: [...ADMIN_WIDGETS],
    vendedorWidgets: [...VENDEDOR_WIDGETS],
  });
});

describe('useDashboardStore', () => {
  it('estado inicial correcto', () => {
    const s = useDashboardStore.getState();
    expect(s.selectedView).toBe('admin');
    expect(s.isCustomizing).toBe(false);
    expect(s.adminWidgets.length).toBe(4);
    expect(s.vendedorWidgets.length).toBe(2);
  });

  it('setSelectedView cambia la vista', () => {
    useDashboardStore.getState().setSelectedView('vendedor');
    expect(useDashboardStore.getState().selectedView).toBe('vendedor');
  });

  it('setCustomizing abre/cierra el modal', () => {
    useDashboardStore.getState().setCustomizing(true);
    expect(useDashboardStore.getState().isCustomizing).toBe(true);
    useDashboardStore.getState().setCustomizing(false);
    expect(useDashboardStore.getState().isCustomizing).toBe(false);
  });

  it('toggleWidget desactiva y reactiva un widget admin', () => {
    const { toggleWidget } = useDashboardStore.getState();
    toggleWidget('admin', 'cotizadoVsVendido');
    expect(
      useDashboardStore.getState().adminWidgets.find((w) => w.id === 'cotizadoVsVendido')?.isActive
    ).toBe(false);

    toggleWidget('admin', 'cotizadoVsVendido');
    expect(
      useDashboardStore.getState().adminWidgets.find((w) => w.id === 'cotizadoVsVendido')?.isActive
    ).toBe(true);
  });

  it('toggleWidget no afecta widgets de la otra vista', () => {
    useDashboardStore.getState().toggleWidget('vendedor', 'cotizadoVsVendido');
    expect(
      useDashboardStore.getState().adminWidgets.find((w) => w.id === 'cotizadoVsVendido')?.isActive
    ).toBe(true);
  });

  it('setWidgetChartType cambia el tipo de gráfico', () => {
    useDashboardStore.getState().setWidgetChartType('admin', 'cotizadoVsVendido', 'donut');
    expect(
      useDashboardStore.getState().adminWidgets.find((w) => w.id === 'cotizadoVsVendido')?.chartType
    ).toBe('donut');
  });

  it('resetWidgets restaura los defaults', () => {
    useDashboardStore.getState().toggleWidget('admin', 'cotizadoVsVendido');
    useDashboardStore.getState().setWidgetChartType('admin', 'stockBajo', 'donut');
    useDashboardStore.getState().resetWidgets();

    const s = useDashboardStore.getState();
    expect(s.adminWidgets).toEqual(ADMIN_WIDGETS);
    expect(s.vendedorWidgets).toEqual(VENDEDOR_WIDGETS);
  });

  it('persiste selectedView en localStorage', () => {
    useDashboardStore.getState().setSelectedView('vendedor');
    const raw = localStorage.getItem('dashboard-layout');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.selectedView).toBe('vendedor');
  });
});

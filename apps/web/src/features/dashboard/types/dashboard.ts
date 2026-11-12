/** Tipos alineados con los endpoints de `apps/api` y la visualización del Dashboard. */

export type DashboardView = 'admin' | 'vendedor';

export type ChartType = 'bar' | 'line' | 'donut' | 'table';

export type ColSpan = 2 | 3 | 4 | 6 | 8 | 12;
export type RowSpan = 1 | 2 | 3 | 4;

export interface KpiConfig {
  id: string;
  title: string;
  isActive: boolean;
  colSpan?: ColSpan;
  rowSpan?: RowSpan;
}

export interface WidgetConfig {
  id: string;
  title: string;
  chartType: ChartType;
  isActive: boolean;
  colSpan?: ColSpan;
  rowSpan?: RowSpan;
}

export interface TopProductoItem {
  codigo: string;
  nombre: string;
  unidades: number;
  total: number;
}

export interface VentaCanalItem {
  canal: string;
  monto: number;
  porcentaje: number;
}

export interface DashboardKpis {
  tasaConversion: number;
  efectividadIA: number;
  tiempoPromedioCotizacion: number;
  alertasStockActivas: number;
  eficacia: number;
  rendimientoMonetario: number;
  ventasTotales: number;
}

export interface PuntoMensual {
  mes: string;
  cotizado: number;
  vendido: number;
}

export interface ConteoPorEstado {
  estado: string;
  cantidad: number;
}

export interface DashboardGraficos {
  cotizadoVsVendido: PuntoMensual[];
  alertasPorAlmacen: Array<{ almacen: string; cantidad: number }>;
  cotizacionesPorEstado: ConteoPorEstado[];
  ventasPorCanal?: VentaCanalItem[];
  topProductos?: TopProductoItem[];
}

export interface AlertaStockBajo {
  id_alerta: number;
  id_producto: number;
  codigo: string;
  descripcion: string;
  id_almacen: number;
  almacen_nombre: string;
  stock_actual: number;
  stock_minimo: number;
  estado: string;
  created_at: string;
}

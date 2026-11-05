/** Tipos alineados con los endpoints ligeros de `apps/api` DashboardModule. */

export type DashboardView = 'admin' | 'vendedor';

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

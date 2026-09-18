export interface MetricaKpi {
  titulo: string;
  valor: string | number;
  incremento?: string;
  icono: string;
}

export interface AccesoRapidoItem {
  titulo: string;
  descripcion: string;
  href: string;
  icono: string;
}

export interface DashboardMetrics {
  total_productos: number;
  cotizaciones_pendientes: number;
  ventas_hoy: number;
  por_cobrar_total: number;
}

export interface DashboardStats {
  totalProductos: number;
  totalCotizaciones: number;
  totalVentas: number;
  montoPendiente: number;
  productosBajoStock: number;
  cotizacionesEsteMes: number;
}
export interface DetalleReporte {
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
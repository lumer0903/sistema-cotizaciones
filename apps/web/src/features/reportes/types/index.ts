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

/** Tipos compartidos para los nuevos reportes (Sprint 5). */

export interface FiltrosReporte {
  fechaInicio?: string;
  fechaFin?: string;
  idVendedor?: number;
  idAlmacen?: number;
  idCliente?: number;
  idProducto?: number;
}

export interface RankingProducto {
  idProducto: number;
  codigo: string;
  descripcion: string;
  cantidadVendida: number;
  ingresoTotal: number;
  numeroCotizaciones: number;
}

export interface RankingProductosResponse {
  data: RankingProducto[];
  total: number;
  take: number;
  skip: number;
}

export interface AntiguedadDeuda {
  idCliente: number;
  cliente: string;
  rucDni: string | null;
  totalPendiente: number;
  d0_30: number;
  d31_60: number;
  d61_90: number;
  d90mas: number;
  diasCreditoDefecto: number | null;
  diasGracia: number | null;
}

export interface AntiguedadDeudaResponse {
  data: AntiguedadDeuda[];
  total: number;
  take: number;
  skip: number;
}

export interface AuditoriaIa {
  idInteraccion: number;
  createdAt: string;
  tipoSugerencia: string | null;
  accionUsuario: string | null;
  productoOriginal: string | null;
  productoSugerido: string | null;
  idCotizacion: number | null;
  vendedor: string | null;
}

export interface AuditoriaIaResponse {
  data: AuditoriaIa[];
  total: number;
  take: number;
  skip: number;
}

/** Tipo de reporte activo en la vista. */
export type TipoReporte = 'ranking-productos' | 'antiguedad-deuda' | 'auditoria-ia';

/** Opciones de exportación. */
export type FormatoExportacion = 'csv' | 'json';
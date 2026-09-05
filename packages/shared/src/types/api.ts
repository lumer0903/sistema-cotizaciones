import { UsuarioAutenticado, JWTPayload, TokenPair } from '../auth/jwt';
import { ProductoConPrecios, CotizacionConDetalle, VentaConDetalle } from './database';

export interface AuthResponse {
  token: string;
  usuario: UsuarioAutenticado;
}

export interface MeResponse {
  usuario: UsuarioAutenticado;
}

export interface ProductoResponse {
  id_producto: number;
  codigo: string;
  descripcion: string;
  stock_total: number;
  stock_minimo: number;
  foto_url: string | null;
  id_categoria: number | null;
  nombre_categoria: string | null;
  unidades_por_caja: number;
  costo_normal?: number;
  precio_unidad_normal?: number;
  precio_docena_normal?: number;
  precio_mayor_normal?: number;
  costo_distribuidor?: number;
  precio_unidad_dist?: number;
  precio_docena_dist?: number;
  precio_mayor_dist?: number;
}

export interface CategoriaResponse {
  id_categoria: number;
  nombre_categoria: string;
}

export interface HistorialPrecioResponse {
  id_historial: number;
  id_producto: number;
  campo_modificado: string;
  valor_anterior: number;
  valor_nuevo: number;
  diferencia: number;
  fecha_cambio: Date;
  usuario_nombre: string | null;
}

export interface CotizacionResponse {
  id_cotizacion: number;
  numero: string;
  id_cliente: number | null;
  id_usuario: number | null;
  tipo_precio: string;
  subtotal: number;
  igv: number;
  total: number;
  observaciones: string | null;
  incluye_carreta: boolean;
  costo_carreta: number;
  estado: string;
  tiempo_inicio: Date;
  tiempo_fin: Date | null;
  created_at: Date;
  cliente_nombre: string | null;
  telefono: string | null;
  email: string | null;
  ruc_dni: string | null;
  detalle: CotizacionDetalleResponse[];
}

export interface CotizacionDetalleResponse {
  id_detalle: number;
  id_producto: number;
  tipo_venta: string;
  cantidad: number;
  color_notas: string | null;
  precio_unitario: number;
  subtotal: number;
  es_sugerido_ia: boolean;
  codigo: string | null;
  descripcion: string | null;
  stock_total: number | null;
  foto_url: string | null;
  precio_unidad_normal: number;
  precio_docena_normal: number;
  precio_mayor_normal: number;
  precio_unidad_dist: number;
  precio_docena_dist: number;
  precio_mayor_dist: number;
}

export interface VentaResponse {
  id_venta: number;
  serie: string;
  correlativo: number;
  numero_completo: string;
  tipo_documento: string;
  estado: string;
  fecha_emision: Date;
  fecha_vencimiento: Date | null;
  id_cotizacion: number | null;
  id_cliente: number;
  id_usuario: number;
  id_almacen: number;
  subtotal: number;
  igv: number;
  total: number;
  descuento_global: number;
  tipoPago: string;
  diasPlazo: number | null;
  montoPagado: number;
  montoPendiente: number;
  autorizadoPor: number | null;
  autorizadoAt: Date | null;
  observaciones: string | null;
  created_at: Date;
  updated_at: Date;
  cliente: {
    id_cliente: number;
    nombre: string;
    tipo: string;
  };
  usuario: {
    id_usuario: number;
    nombre: string;
  };
  almacen: {
    id_almacen: number;
    nombre: string;
  };
  detalles: VentaDetalleResponse[];
  pagos: VentaPagoResponse[];
  cuentasCobrar: CuentaCobrarResponse[];
}

export interface VentaDetalleResponse {
  id_detalle: number;
  id_venta: number;
  id_producto: number;
  tipo_venta: string;
  cantidad: number;
  precio_unitario: number;
  descuento_item: number;
  subtotal: number;
  igv_item: number;
  total_item: number;
  es_sugerido_ia: boolean;
  producto: {
    id_producto: number;
    codigo: string;
    descripcion: string;
    precios_actuales: ProductoConPrecios['precios_actuales'];
  };
}

export interface VentaPagoResponse {
  id_pago: number;
  id_venta: number;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  id_usuario: number | null;
  fecha_pago: Date;
  usuario: {
    id_usuario: number;
    nombre: string;
  } | null;
}

export interface CuentaCobrarResponse {
  id_cuenta: number;
  id_venta: number;
  id_cliente: number;
  id_usuario: number | null;
  montoOriginal: number;
  montoPendiente: number;
  estado: string;
  fechaVencimiento: Date;
  fechaPago: Date | null;
  created_at: Date;
}

export interface RecomendacionResponse {
  tipo: string;
  producto: {
    id_producto: number;
    codigo: string;
    descripcion: string;
    stock_total: number;
    foto_url: string | null;
    similitud: number;
    precio_referencia: number;
  } | null;
}

export interface KpiMensualesResponse {
  tiempo_promedio_cierre: number;
  eficacia_cotizaciones: number;
  conversion_ventas: number;
  cobranza_efectiva: number;
}
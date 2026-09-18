export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'TARJETA';

export type TipoComprobante = 'BOLETA' | 'FACTURA' | 'NOTA_VENTA';

export interface DetalleVenta {
  id_detalle: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Venta {
  id_venta: number;
  correlativo: string;
  tipo_comprobante: TipoComprobante;
  cliente: string;
  total: number;
  metodo_pago: MetodoPago;
  es_credito: boolean;
  fecha: string;
  detalles: DetalleVenta[];
}
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'TARJETA';

export type EstadoCobranza = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';

export interface HistorialPago {
  id_pago: number;
  fecha: string;
  monto: number;
  metodo_pago: MetodoPago;
  referencia?: string;
}

export interface CuentaPorCobrar {
  id_cuenta: number;
  id_venta: number;
  comprobante: string;
  cliente: string;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_vencimiento: string;
  estado: EstadoCobranza;
  pagos: HistorialPago[];
}
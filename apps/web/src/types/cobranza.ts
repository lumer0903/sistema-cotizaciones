export type EstadoCobranza = 'pendiente' | 'parcial' | 'pagada' | 'vencida';

export interface HistorialPago {
  id_pago: number;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
  created_at: string;
  usuario: { id_usuario: number; nombre: string } | null;
}

export interface CobranzaCliente {
  id_cliente: number;
  nombre: string;
  ruc_dni: string | null;
  email: string | null;
  telefono: string | null;
}

export interface CuentaPorCobrar {
  id_cotizacion: number;
  numero: string;
  id_cliente: number | null;
  created_at: string;
  fecha_vencimiento: string | null;
  estado_cotizacion: string;
  estado_cobranza: EstadoCobranza;
  total: number;
  pagado: number;
  saldo: number;
  dias_atraso: number;
  vencida: boolean;
  cliente: CobranzaCliente | null;
}

export interface CobranzaDetalle extends CuentaPorCobrar {
  observaciones: string | null;
  incluye_carreta: boolean;
  costo_carreta: number;
  subtotal: number;
  pagos: HistorialPago[];
}

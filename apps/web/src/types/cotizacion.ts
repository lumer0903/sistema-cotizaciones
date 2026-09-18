export type EstadoCotizacion = 'borrador' | 'pendiente' | 'aprobada' | 'rechazada' | string;

export interface DetalleCotizacion {
  id: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: string;
  codigo: string;
  estado: EstadoCotizacion;
  escala?: string;
  detalles: DetalleCotizacion[];
  total: number;
  fechaCreacion: string;
}
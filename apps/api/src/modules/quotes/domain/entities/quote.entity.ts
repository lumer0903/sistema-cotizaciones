import { TipoPrecio, TipoVenta, EstadoCotizacion } from '@goldcontinent/shared/constants/enums';

export interface QuoteDetalle {
  id_detalle?: number;
  id_producto: number;
  tipo_venta: TipoVenta;
  cantidad: number;
  color_notas?: string;
  precio_unitario: number;
  subtotal: number;
  es_sugerido_ia: boolean;
  producto?: {
    id_producto: number;
    codigo: string;
    descripcion: string;
  };
}

export class QuoteEntity {
  id_cotizacion!: number;
  numero!: string;
  id_cliente?: number;
  id_usuario?: number;
  tipo_precio!: TipoPrecio;
  subtotal!: number;
  igv!: number;
  total!: number;
  observaciones?: string;
  incluye_carreta!: boolean;
  costo_carreta!: number;
  estado!: EstadoCotizacion;
  tiempo_inicio!: Date;
  tiempo_fin?: Date;
  fecha_vencimiento?: Date;
  created_at!: Date;
  updated_at!: Date;
  detalle: QuoteDetalle[] = [];
  cliente?: {
    id_cliente: number;
    nombre: string;
    tipo: TipoPrecio;
  } | null;
  usuario?: {
    id_usuario: number;
    nombre: string;
  } | null;

  constructor(partial: Partial<QuoteEntity>) {
    Object.assign(this, partial);
  }

  calculateTotals(): { subtotal: number; igv: number; total: number } {
    const subtotal = this.detalle.reduce((sum, item) => sum + item.subtotal, 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv + (this.incluye_carreta ? this.costo_carreta : 0);
    return { subtotal, igv, total };
  }
}
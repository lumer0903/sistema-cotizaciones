export type PriceTier = 'unidad' | 'docena' | 'caja';

export type PriceField = 'tienda' | 'distribuidor';

export interface PrecioMatriz {
  tienda: Record<PriceTier, number>;
  distribuidor: Record<PriceTier, number>;
}

export interface HistorialPrecio {
  id_historial: number;
  id_producto: number;
  codigo_producto: string;
  tipo_precio: string;
  escala: PriceTier;
  precio_anterior: number;
  precio_nuevo: number;
  usuario_id: number;
  usuario_nombre: string;
  fecha_cambio: string;
}
import { TipoPrecio, TipoVenta } from './enums';

export const PRECIO_CAMPOS = [
  'costo_normal',
  'precio_unidad_normal',
  'precio_docena_normal',
  'precio_mayor_normal',
  'costo_distribuidor',
  'precio_unidad_dist',
  'precio_docena_dist',
  'precio_mayor_dist',
] as const;

export function normalizarTipoPrecio(tipo: string): TipoPrecio {
  return tipo === 'distribuidor' ? TipoPrecio.distribuidor : TipoPrecio.normal;
}

export function campoPrecio(tipoPrecio: TipoPrecio, tipoVenta: TipoVenta): string {
  const sufijo = tipoPrecio === TipoPrecio.distribuidor ? 'dist' : 'normal';
  switch (tipoVenta) {
    case TipoVenta.docena:
      return `precio_docena_${sufijo}`;
    case TipoVenta.mayor:
      return `precio_mayor_${sufijo}`;
    default:
      return `precio_unidad_${sufijo}`;
  }
}

export function campoCosto(tipoPrecio: TipoPrecio): string {
  return tipoPrecio === TipoPrecio.distribuidor ? 'costo_distribuidor' : 'costo_normal';
}

export function determinarTipoVenta(cantidad: number, unidadesPorCaja: number): TipoVenta {
  if (cantidad <= 11) return TipoVenta.unidad;
  if (cantidad < unidadesPorCaja) return TipoVenta.docena;
  return TipoVenta.mayor;
}

export function precioProducto(
  precios: Record<string, number | null | undefined>,
  tipoPrecio: TipoPrecio,
  tipoVenta: TipoVenta
): number {
  const campo = campoPrecio(tipoPrecio, tipoVenta);
  return Number(precios[campo] ?? 0);
}

export function costoProducto(
  precios: Record<string, number | null | undefined>,
  tipoPrecio: TipoPrecio
): number {
  const campo = campoCosto(tipoPrecio);
  return Number(precios[campo] ?? 0);
}
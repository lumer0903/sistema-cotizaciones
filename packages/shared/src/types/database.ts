import {
  Usuario,
  Producto,
  Categoria,
  PreciosActuales,
  HistorialPrecios,
  Cliente,
  Cotizacion,
  CotizacionDetalle,
  Almacen,
  StockActual,
  InventarioMovimiento,
  IaInteracciones,
  Rol,
  EstadoCotizacion,
  TipoPrecio,
  TipoVenta,
  TipoMovimiento,
  OrigenMovimiento,
} from '@prisma/client';

export type {
  Usuario,
  Producto,
  Categoria,
  PreciosActuales,
  HistorialPrecios,
  Cliente,
  Cotizacion,
  CotizacionDetalle,
  Almacen,
  StockActual,
  InventarioMovimiento,
  IaInteracciones,
  Rol,
  EstadoCotizacion,
  TipoPrecio,
  TipoVenta,
  TipoMovimiento,
  OrigenMovimiento,
};

export type TipoMovimientoInventario = TipoMovimiento;

export type ProductoConPrecios = Producto & {
  precios_actuales: PreciosActuales | null;
  categoria: Categoria | null;
};

export type CotizacionConDetalle = Cotizacion & {
  cliente: Cliente | null;
  usuario: Usuario | null;
  detalle: (CotizacionDetalle & {
    producto: ProductoConPrecios;
  })[];
};

export type StockConProducto = StockActual & {
  producto: Producto;
  almacen: Almacen;
};
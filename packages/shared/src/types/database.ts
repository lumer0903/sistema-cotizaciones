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
  Venta,
  VentaDetalle,
  VentaPago,
  CuentaCobrar,
  InventarioMovimiento,
  IaInteracciones,
  Rol,
  EstadoCotizacion,
  TipoPrecio,
  TipoVenta,
  EstadoVenta,
  TipoDocumentoVenta,
  EstadoCuenta,
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
  Venta,
  VentaDetalle,
  VentaPago,
  CuentaCobrar,
  InventarioMovimiento,
  IaInteracciones,
  Rol,
  EstadoCotizacion,
  TipoPrecio,
  TipoVenta,
  EstadoVenta,
  TipoDocumentoVenta,
  EstadoCuenta,
  TipoMovimiento,
  OrigenMovimiento,
};

export type TipoDocumento = TipoDocumentoVenta;
export type TipoMovimientoInventario = TipoMovimiento;
export type EstadoCuentaCobrar = EstadoCuenta;

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

export type VentaConDetalle = Venta & {
  cliente: Cliente;
  usuario: Usuario;
  almacen: Almacen;
  detalles: (VentaDetalle & {
    producto: ProductoConPrecios;
  })[];
  pagos: (VentaPago & { usuario: Usuario | null })[];
  cuentasCobrar: CuentaCobrar[];
};

export type StockConProducto = StockActual & {
  producto: Producto;
  almacen: Almacen;
};
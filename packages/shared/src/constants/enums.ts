export const Rol = {
  admin: 'admin',
  gerente: 'gerente',
  vendedor: 'vendedor',
} as const;

export type Rol = (typeof Rol)[keyof typeof Rol];

export const EstadoCotizacion = {
  borrador: 'borrador',
  enviada: 'enviada',
  aprobada: 'aprobada',
  rechazada: 'rechazada',
} as const;

export type EstadoCotizacion = (typeof EstadoCotizacion)[keyof typeof EstadoCotizacion];

export const TipoPrecio = {
  normal: 'normal',
  distribuidor: 'distribuidor',
} as const;

export type TipoPrecio = (typeof TipoPrecio)[keyof typeof TipoPrecio];

export const TipoVenta = {
  unidad: 'unidad',
  docena: 'docena',
  mayor: 'mayor',
} as const;

export type TipoVenta = (typeof TipoVenta)[keyof typeof TipoVenta];

export const EstadoVenta = {
  borrador: 'borrador',
  emitida: 'emitida',
  pagada: 'pagada',
  parcial: 'parcial',
  anulada: 'anulada',
  devuelta: 'devuelta',
} as const;

export type EstadoVenta = (typeof EstadoVenta)[keyof typeof EstadoVenta];

export const TipoPago = {
  contado: 'contado',
  credito: 'credito',
} as const;

export type TipoPago = (typeof TipoPago)[keyof typeof TipoPago];

export const TipoDocumento = {
  boleta: 'boleta',
  factura: 'factura',
  nota_venta: 'nota_venta',
  nota_credito: 'nota_credito',
  nota_debito: 'nota_debito',
  guia_remision: 'guia_remision',
} as const;

export type TipoDocumento = (typeof TipoDocumento)[keyof typeof TipoDocumento];

export const EstadoCuentaCobrar = {
  pendiente: 'pendiente',
  parcial: 'parcial',
  pagada: 'pagada',
  vencida: 'vencida',
  anulada: 'anulada',
} as const;

export type EstadoCuentaCobrar = (typeof EstadoCuentaCobrar)[keyof typeof EstadoCuentaCobrar];

export const TipoMovimientoInventario = {
  entrada: 'entrada',
  salida: 'salida',
  ajuste: 'ajuste',
  transferencia: 'transferencia',
} as const;

export type TipoMovimientoInventario = (typeof TipoMovimientoInventario)[keyof typeof TipoMovimientoInventario];

export const OrigenMovimiento = {
  compra: 'compra',
  venta: 'venta',
  devolucion_cliente: 'devolucion_cliente',
  ajuste_fisico: 'ajuste_fisico',
  merma: 'merma',
  transferencia: 'transferencia',
  cotizacion_aprobada: 'cotizacion_aprobada',
} as const;

export type OrigenMovimiento = (typeof OrigenMovimiento)[keyof typeof OrigenMovimiento];

export const MetodoPago = {
  efectivo: 'efectivo',
  transferencia: 'transferencia',
  tarjeta_credito: 'tarjeta_credito',
  tarjeta_debito: 'tarjeta_debito',
  yape_plin: 'yape_plin',
  mixto: 'mixto',
  credito: 'credito',
} as const;

export type MetodoPago = (typeof MetodoPago)[keyof typeof MetodoPago];

export const PermisoModulo = {
  dashboard: 'dashboard',
  productos: 'productos',
  importacion: 'importacion',
  consulta_precios: 'consulta_precios',
  cotizaciones: 'cotizaciones',
  recomendaciones: 'recomendaciones',
  pdf: 'pdf',
  usuarios: 'usuarios',
  cobranza: 'cobranza',
  ventas: 'ventas',
  reportes: 'reportes',
  configuracion: 'configuracion',
} as const;

export type PermisoModulo = (typeof PermisoModulo)[keyof typeof PermisoModulo];

export const NivelPermiso = {
  sin_acceso: 'sin_acceso',
  lectura: 'lectura',
  edicion: 'edicion',
} as const;

export type NivelPermiso = (typeof NivelPermiso)[keyof typeof NivelPermiso];
import { z } from 'zod';
import { EstadoVenta, TipoDocumento, TipoPago, TipoPrecio, TipoVenta } from '../constants/enums';

export const ventaDetalleSchema = z.object({
  idProducto: z.coerce.number().int().positive(),
  tipoVenta: z.nativeEnum(TipoVenta).optional(),
  cantidad: z.coerce.number().int().positive(),
  descuentoItem: z.coerce.number().multipleOf(0.01).min(0).default(0),
  esSugeridoIa: z.boolean().default(false),
});

export type VentaDetalleInput = z.infer<typeof ventaDetalleSchema>;

export const createVentaSchema = z.object({
  idCliente: z.coerce.number().int().positive(),
  idCotizacion: z.coerce.number().int().positive().optional(),
  tipoPrecio: z.nativeEnum(TipoPrecio).default(TipoPrecio.normal),
  detalles: z.array(ventaDetalleSchema).min(1, 'La venta debe tener al menos un detalle'),
  tipoPago: z.nativeEnum(TipoPago).default(TipoPago.contado),
  diasPlazo: z.coerce.number().int().min(1).max(365).optional(),
  observaciones: z.string().optional().nullable(),
  descuentoGlobal: z.coerce.number().multipleOf(0.01).min(0).default(0),
  idAlmacen: z.coerce.number().int().positive().optional(),
}).refine(
  (data) => {
    if (data.tipoPago === TipoPago.credito && !data.diasPlazo) {
      return false;
    }
    return true;
  },
  {
    message: 'Venta a crédito requiere días de plazo (1-365)',
    path: ['diasPlazo'],
  }
);

export type CreateVentaInput = z.infer<typeof createVentaSchema>;

export const crearDesdeCotizacionSchema = z.object({
  tipoPago: z.nativeEnum(TipoPago).default(TipoPago.contado),
  diasPlazo: z.coerce.number().int().min(1).max(365).optional(),
}).refine(
  (data) => {
    if (data.tipoPago === TipoPago.credito && !data.diasPlazo) {
      return false;
    }
    return true;
  },
  {
    message: 'Venta a crédito requiere días de plazo (1-365)',
    path: ['diasPlazo'],
  }
);

export type CrearDesdeCotizacionInput = z.infer<typeof crearDesdeCotizacionSchema>;

export const registrarPagoSchema = z.object({
  monto: z.coerce.number().multipleOf(0.01).positive('El monto debe ser mayor a 0'),
  metodoPago: z.string().default('efectivo'),
  referencia: z.string().optional().nullable(),
});

export type RegistrarPagoInput = z.infer<typeof registrarPagoSchema>;

export const ventaQuerySchema = z.object({
  q: z.string().optional(),
  estado: z.nativeEnum(EstadoVenta).optional(),
  tipoPago: z.nativeEnum(TipoPago).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type VentaQueryInput = z.infer<typeof ventaQuerySchema>;
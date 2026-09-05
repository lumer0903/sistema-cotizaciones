import { z } from 'zod';
import { EstadoCotizacion, TipoPrecio, TipoVenta } from '../constants/enums';

export const cotizacionDetalleSchema = z.object({
  id_producto: z.coerce.number().int().positive(),
  tipo_venta: z.nativeEnum(TipoVenta),
  cantidad: z.coerce.number().int().positive(),
  color_notas: z.string().max(100).optional().nullable(),
  es_sugerido_ia: z.boolean().default(false),
});

export type CotizacionDetalleInput = z.infer<typeof cotizacionDetalleSchema>;

export const createCotizacionSchema = z.object({
  cliente_nombre: z.string().min(1, 'Nombre del cliente es obligatorio').max(255),
  telefono: z.string().max(50).optional().nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  ruc_dni: z.string().max(20).optional().nullable(),
  tipo_precio: z.nativeEnum(TipoPrecio).default(TipoPrecio.normal),
  observaciones: z.string().optional().nullable(),
  incluye_carreta: z.boolean().default(true),
  costo_carreta: z.coerce.number().multipleOf(0.01).min(0).default(15),
  detalles: z.array(cotizacionDetalleSchema).min(1, 'Debe agregar al menos un producto'),
});

export type CreateCotizacionInput = z.infer<typeof createCotizacionSchema>;

export const updateCotizacionSchema = z.object({
  observaciones: z.string().optional().nullable(),
  incluye_carreta: z.boolean().optional(),
  costo_carreta: z.coerce.number().multipleOf(0.01).min(0).optional(),
});

export type UpdateCotizacionInput = z.infer<typeof updateCotizacionSchema>;

export const cambiarEstadoSchema = z.object({
  estado: z.nativeEnum(EstadoCotizacion),
});

export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

export const agregarDetalleSchema = cotizacionDetalleSchema;
export type AgregarDetalleInput = z.infer<typeof agregarDetalleSchema>;

export const actualizarDetalleSchema = cotizacionDetalleSchema.partial().required({ id_producto: true, cantidad: true });
export type ActualizarDetalleInput = z.infer<typeof actualizarDetalleSchema>;

export const cotizacionQuerySchema = z.object({
  q: z.string().optional(),
  estado: z.nativeEnum(EstadoCotizacion).optional(),
  fecha: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CotizacionQueryInput = z.infer<typeof cotizacionQuerySchema>;

export const buscarProductosSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type BuscarProductosInput = z.infer<typeof buscarProductosSchema>;

export const recomendacionSchema = z.object({
  id_producto: z.coerce.number().int().positive(),
});

export type RecomendacionInput = z.infer<typeof recomendacionSchema>;
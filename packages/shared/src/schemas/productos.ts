import { z } from 'zod';
import { TipoPrecio, TipoVenta } from '../constants/enums';

export const productoBaseSchema = z.object({
  codigo: z.string().min(1, 'Código es obligatorio').max(50),
  descripcion: z.string().min(1, 'Descripción es obligatoria').max(255),
  foto_url: z.string().url('URL de foto inválida').optional().nullable(),
  stock_total: z.coerce.number().int().min(0).default(0),
  stock_minimo: z.coerce.number().int().min(0).default(10),
  id_categoria: z.coerce.number().int().positive().optional().nullable(),
  unidades_por_caja: z.coerce.number().int().positive().default(1),
});

export const preciosSchema = z.object({
  costo_normal: z.coerce.number().multipleOf(0.01).default(0),
  precio_unidad_normal: z.coerce.number().multipleOf(0.01).default(0),
  precio_docena_normal: z.coerce.number().multipleOf(0.01).default(0),
  precio_mayor_normal: z.coerce.number().multipleOf(0.01).default(0),
  costo_distribuidor: z.coerce.number().multipleOf(0.01).default(0),
  precio_unidad_dist: z.coerce.number().multipleOf(0.01).default(0),
  precio_docena_dist: z.coerce.number().multipleOf(0.01).default(0),
  precio_mayor_dist: z.coerce.number().multipleOf(0.01).default(0),
});

export const createProductoSchema = productoBaseSchema.merge(preciosSchema);
export type CreateProductoInput = z.infer<typeof createProductoSchema>;

export const updateProductoSchema = productoBaseSchema.partial().merge(preciosSchema.partial());
export type UpdateProductoInput = z.infer<typeof updateProductoSchema>;

export const productoQuerySchema = z.object({
  q: z.string().optional(),
  categoria: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ProductoQueryInput = z.infer<typeof productoQuerySchema>;

export const importarProductosSchema = z.object({
  file: z.any(), // Multer file handled separately
});

export type ImportarProductosInput = z.infer<typeof importarProductosSchema>;

export const histPreciosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type HistPreciosQueryInput = z.infer<typeof histPreciosQuerySchema>;
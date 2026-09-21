import { z } from "zod";

export const CrearProductoSchema = z.object({
  codigo: z.string().min(2, "El código es obligatorio"),
  id_categoria: z.coerce.number().min(1, "Seleccione una categoría"),
  id_almacen: z.coerce.number().min(1, "Seleccione un almacén"),
  tipo_flor: z.string().min(1, "Seleccione el tipo de flor"),
  material: z.string().optional().nullable(),
  composicion: z.string().min(1, "Seleccione la composición"),
  presentacion: z.string().optional().nullable(),
  numero_cabezas: z.coerce.number().min(1, "Ingrese el número de cabezas"),
  tamano: z.string().optional().nullable(),
  unidades_por_caja: z.coerce.number().min(1, "Ingrese unidades por caja"),
  stock_principal: z.coerce.number().min(0, "El stock no puede ser negativo"),
  stock_minimo: z.coerce.number().min(0, "El stock mínimo no puede ser negativo"),
  descripcion: z.string().min(5, "La descripción es obligatoria (mínimo 5 caracteres)"),
  colores_surtido: z.array(z.string()).min(1, "Configure al menos un color para el surtido"),
  
  // Precios Tienda (Normal)
  precio_tienda_unidad: z.coerce.number().positive("Ingrese precio válido"),
  precio_tienda_docena: z.coerce.number().positive("Ingrese precio válido"),
  precio_tienda_caja: z.coerce.number().positive("Ingrese precio válido"),
  
  // Precios Distribuidor
  precio_distribuidor_unidad: z.coerce.number().positive("Ingrese precio válido"),
  precio_distribuidor_docena: z.coerce.number().positive("Ingrese precio válido"),
  precio_distribuidor_caja: z.coerce.number().positive("Ingrese precio válido"),
  
  // Costos opcionales (Default 0.00)
  costo_normal: z.coerce.number().min(0).default(0),
  costo_distribuidor: z.coerce.number().min(0).default(0)
});

export type CrearProductoInput = z.infer<typeof CrearProductoSchema>;


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
  file: z.any(),
});

export type ImportarProductosInput = z.infer<typeof importarProductosSchema>;

export const histPreciosQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type HistPreciosQueryInput = z.infer<typeof histPreciosQuerySchema>;
import { z } from 'zod';

export const createAlmacenSchema = z.object({
  nombre: z.string().min(1, 'Nombre es obligatorio').max(100),
  ubicacion: z.string().max(255).optional().nullable(),
  es_principal: z.boolean().default(false),
});

export type CreateAlmacenInput = z.infer<typeof createAlmacenSchema>;

export const updateAlmacenSchema = createAlmacenSchema.partial();
export type UpdateAlmacenInput = z.infer<typeof updateAlmacenSchema>;

export const almacenQuerySchema = z.object({
  q: z.string().optional(),
  activo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type AlmacenQueryInput = z.infer<typeof almacenQuerySchema>;
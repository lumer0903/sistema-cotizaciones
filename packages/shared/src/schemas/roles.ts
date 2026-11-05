import { z } from 'zod';
import { PermisoModulo, NivelPermiso } from '../constants/enums';

export const createRolSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  codigo: z
    .string()
    .min(2, 'El código debe tener al menos 2 caracteres')
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'El código solo puede contener minúsculas, números y guion bajo'),
});

export type CreateRolInput = z.infer<typeof createRolSchema>;

export const updateRolSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  activo: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});

export type UpdateRolInput = z.infer<typeof updateRolSchema>;

export const rolPermisosSchema = z.object(
  Object.fromEntries(
    Object.values(PermisoModulo).map((m) => [m, z.nativeEnum(NivelPermiso)]),
  ) as Record<PermisoModulo, z.ZodNativeEnum<typeof NivelPermiso>>,
);

export type RolPermisosInput = z.infer<typeof rolPermisosSchema>;

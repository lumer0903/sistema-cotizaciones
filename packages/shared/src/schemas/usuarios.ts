import { z } from 'zod';
import { PermisoModulo, NivelPermiso } from '../constants/enums';

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.string().min(2).max(40).default('vendedor'),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.string().min(2).max(40).optional(),
  activo: z.boolean().optional(),
});

export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;

export const updatePerfilSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

export type UpdatePerfilInput = z.infer<typeof updatePerfilSchema>;

export const usuarioQuerySchema = z.object({
  q: z.string().optional(),
  rol: z.string().min(2).max(40).optional(),
  activo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type UsuarioQueryInput = z.infer<typeof usuarioQuerySchema>;

export const usuarioPermisosSchema = z.object(
  Object.fromEntries(
    Object.values(PermisoModulo).map((m) => [m, z.nativeEnum(NivelPermiso)]),
  ) as Record<PermisoModulo, z.ZodNativeEnum<typeof NivelPermiso>>,
);

export type UsuarioPermisosInput = z.infer<typeof usuarioPermisosSchema>;
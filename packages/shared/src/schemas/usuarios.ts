import { z } from 'zod';
import { Rol } from '../constants/enums';

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  rol: z.nativeEnum(Rol).default(Rol.vendedor),
});

export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;

export const updateUsuarioSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  rol: z.nativeEnum(Rol).optional(),
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
  rol: z.nativeEnum(Rol).optional(),
  activo: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type UsuarioQueryInput = z.infer<typeof usuarioQuerySchema>;
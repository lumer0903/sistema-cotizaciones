import { SetMetadata } from '@nestjs/common';
import type { PermisoModulo, NivelPermiso } from '@goldcontinent/shared/constants/enums';
export const PERMISSION_KEY = 'permission';
export interface PermissionRequirement { modulo: PermisoModulo; nivel?: NivelPermiso }
/** Sin nivel explícito: GET/HEAD=lectura, resto=edicion. */
export const Permission = (modulo: PermisoModulo, nivel?: NivelPermiso) =>
  SetMetadata(PERMISSION_KEY, { modulo, nivel } satisfies PermissionRequirement);

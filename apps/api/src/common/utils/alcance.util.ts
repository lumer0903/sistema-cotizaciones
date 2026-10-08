import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Rol } from '@goldcontinent/shared/constants/enums';

/**
 * Usuario extraído del JWT (JwtStrategy.validate).
 * Además del id trae el rol, necesario para el alcance de datos.
 */
export interface UsuarioSesion {
  id_usuario?: number;
  id?: number;
  sub?: number;
  email?: string;
  rol?: string;
}

/**
 * Alcance de datos del usuario autenticado.
 *
 *  - `null`  → ve TODOS los registros (sólo el rol admin).
 *  - number  → ve únicamente los registros cuyo `id_usuario` coincida.
 *              Si la sesión no trae un id válido devuelve `-1`, lo que
 *              resulta en cero filas (fail-closed, nunca filas ajenas).
 *
 * Para que el rol `gerente` vea toda la basta sólo hay que añadirlo al
 * primer `if`.
 */
export function alcanceDeDatos(user?: UsuarioSesion | null): number | null {
  const rol = String(user?.rol ?? '').trim().toLowerCase();
  if (rol === Rol.admin || rol === 'superadmin') return null;

  const id = Number(user?.id_usuario ?? user?.id ?? user?.sub);
  return Number.isFinite(id) && id > 0 ? id : -1;
}

/**
 * Verifica que un registro pertenezca al alcance del usuario.
 * Devuelve `true` si el usuario puede acceder; lanza 404/403 si no.
 */
export function verificarAlcance(
  alcance: number | null,
  idPropietario: number | null | undefined,
  mensajeNoEncontrado = 'Registro no encontrado',
  mensajeSinPermiso = 'No tienes permiso para acceder a este registro',
): void {
  if (alcance === null) return;
  if (Number(idPropietario ?? 0) === alcance) return;
  if (idPropietario == null) throw new NotFoundException(mensajeNoEncontrado);
  throw new ForbiddenException(mensajeSinPermiso);
}

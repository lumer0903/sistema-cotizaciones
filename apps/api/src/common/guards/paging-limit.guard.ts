import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

export const DEFAULT_TAKE = 20;
export const MAX_TAKE = 50;
export const MAX_SKIP = 10_000;

/**
 * Fuerza límites explícitos de paginación en endpoints de reportes:
 *  - `take`: por defecto 20, máximo 50 (nunca se devuelven miles de filas).
 *  - `skip`: por defecto 0, máximo 10.000 (evita offsets patológicos).
 *
 * Aplicar con @UseGuards(PagingLimitGuard) en los controladores de reportes.
 * Normaliza `req.query` antes de que el controlador lo lea.
 */
@Injectable()
export class PagingLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const query = req.query ?? {};

    // En Express 5 (NestJS 11) `req.query` es un getter sin setter: mutarlo
    // lanza "Cannot set property query of #<IncomingMessage> which has only a
    // getter". Sólo se leen los valores normalizados, sin reasignar la propiedad.
    const take = this.clamp(query.take, DEFAULT_TAKE, MAX_TAKE);
    const skip = this.clamp(query.skip, 0, MAX_SKIP);
    Object.defineProperty(req, 'query', {
      value: { ...query, take, skip },
      writable: true,
      configurable: true,
      enumerable: true,
    });
    return true;
  }

  private clamp(raw: unknown, min: number, max: number): number {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min) return min;
    return Math.min(Math.trunc(n), max);
  }
}

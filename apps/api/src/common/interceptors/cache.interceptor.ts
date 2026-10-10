import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  data: unknown;
  expires: number;
}

/**
 * Interceptor de caché en memoria de corto tiempo (TTL 30s)
 * para métricas del dashboard.
 *
 * Seguridad (data scoping): la clave incluye el `id_usuario` de la sesión,
 * por lo que las respuestas cacheadas NUNCA se comparten entre usuarios
 * (un vendedor jamás recibe los KPIs cacheados de otro usuario ni del admin).
 *
 * Uso: @UseInterceptors(CacheInterceptor) sobre controladores GET de métricas.
 * Las mutaciones (POST/PUT/DELETE) limpian la caché completa para que los
 * dashboards reflejen los cambios sin esperar el TTL.
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly store = new Map<string, CacheEntry>();
  private readonly ttlMs = 30_000; // 30s fijo

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (req.method !== 'GET') {
      // Toda mutación invalida las métricas cacheadas
      this.store.clear();
      return next.handle();
    }

    const userId = req.user?.id_usuario ?? req.user?.id ?? 'anon';
    const key = `${userId}|${req.originalUrl ?? req.url}`;
    const now = Date.now();

    const hit = this.store.get(key);
    if (hit && hit.expires > now) {
      return of(hit.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.store.set(key, { data, expires: now + this.ttlMs });
        // Limpieza perezosa: evita crecimiento ilimitado del Map
        if (this.store.size > 500) this.prune(now);
      }),
    );
  }

  private prune(now: number): void {
    for (const [key, entry] of this.store) {
      if (entry.expires <= now) this.store.delete(key);
    }
  }
}

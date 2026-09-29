import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

/**
 * Dispara el reentrenamiento del TF-IDF del microservicio IA (FastAPI) tras
 * crear o editar productos, para que /suggest use las descripciones actualizadas.
 *
 * Fire-and-forget con manejo de errores: un fallo temporal del servicio de IA
 * NUNCA debe bloquear ni reventar la persistencia del producto en PostgreSQL.
 */
@Injectable()
export class AiCacheRefreshService {
  private readonly logger = new Logger(AiCacheRefreshService.name);
  private readonly aiUrl =
    process.env.AI_SERVICE_URL || process.env.IA_URL || 'http://localhost:8000';
  private readonly timeoutMs = parseInt(process.env.AI_REFRESH_CACHE_TIMEOUT || '3000', 10);

  constructor(private readonly httpService: HttpService) {}

  refreshCache(trigger: string): void {
    const request = firstValueFrom(
      this.httpService
        .post(`${this.aiUrl}/admin/refresh-cache`, {}, { timeout: this.timeoutMs })
        .pipe(
          timeout(this.timeoutMs),
          catchError((error: any) => {
            this.logger.warn(
              `refresh-cache IA no disponible (${trigger}): ${error?.message ?? error}`,
            );
            return of(null);
          }),
        ),
    );

    request
      .then((respuesta) => {
        if (respuesta) {
          this.logger.log(
            `Cache TF-IDF de IA refrescada (${trigger}): ${JSON.stringify(respuesta.data ?? {})}`,
          );
        }
      })
      .catch((error: any) => {
        this.logger.warn(`refresh-cache IA falló (${trigger}): ${error?.message ?? error}`);
      });
  }
}

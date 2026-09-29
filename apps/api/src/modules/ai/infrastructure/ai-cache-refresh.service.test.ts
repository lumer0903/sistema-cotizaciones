import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, throwError, NEVER } from 'rxjs';
import { AiCacheRefreshService } from './ai-cache-refresh.service';
import { HttpService } from '@nestjs/axios';

function makeService(postImpl: () => any) {
  const http = { post: vi.fn(postImpl) };
  const service = new AiCacheRefreshService(http as unknown as HttpService);
  return { service, http };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('AiCacheRefreshService (fire-and-forget)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('hace POST a /admin/refresh-cache', async () => {
    const { service, http } = makeService(() =>
      of({ data: { status: 'success', total_productos: 42 } }),
    );

    service.refreshCache('create:1');
    await tick();

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/admin/refresh-cache'),
      {},
      expect.anything(),
    );
  });

  it('nunca lanza si el microservicio IA está caído (no bloquea el guardado)', async () => {
    const { service, http } = makeService(() =>
      throwError(() => new Error('ECONNREFUSED localhost:8000')),
    );

    expect(() => service.refreshCache('update:5')).not.toThrow();
    await tick(); // la promesa interna se absorbe con logger.warn, sin rechazo
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('nunca lanza si la petición expira por timeout', async () => {
    vi.useFakeTimers();
    const { service, http } = makeService(() => NEVER); // observable que nunca emite

    expect(() => service.refreshCache('create:2')).not.toThrow();
    await vi.runAllTimersAsync(); // dispara el tope de AI_REFRESH_CACHE_TIMEOUT
    expect(http.post).toHaveBeenCalledTimes(1);
  });
});

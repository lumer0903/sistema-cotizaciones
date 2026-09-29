import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCotizacionPdfBlob } from './cotizacionApi';

/** Response simulada: evita el mix jsdom-Blob/undici-Response en vitest. */
function mockResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    blob: async () => new Blob([String(body ?? '')]),
    json: async () => body,
  } as unknown as Response;
}

describe('getCotizacionPdfBlob (timeout y polling)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborta con mensaje amigable si la API no responde (Redis caído, cuelgue)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
            );
          }),
      ),
    );

    const promise = getCotizacionPdfBlob(1);
    const assertion = expect(promise).rejects.toThrow('El servidor de PDF no responde');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('retorna el blob cuando la API responde 200 directo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockResponse(200, '%PDF-1.4')),
    );

    const blob = await getCotizacionPdfBlob(2);

    expect(blob).toBeInstanceOf(Blob);
    expect(await blob.text()).toContain('%PDF');
  });

  it('con 202 sondea pdf-status hasta "listo" y descarga el PDF', async () => {
    let exportCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('pdf-status')) {
          return mockResponse(200, { estado: 'listo' });
        }
        exportCalls += 1;
        if (exportCalls === 1) return mockResponse(202);
        return mockResponse(200, '%PDF-1.4');
      }),
    );

    const promise = getCotizacionPdfBlob(3);
    const assertion = expect(promise).resolves.toBeInstanceOf(Blob);
    await vi.runAllTimersAsync();
    await assertion;
    expect(exportCalls).toBe(2);
  });
});

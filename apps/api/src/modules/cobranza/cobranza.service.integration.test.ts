import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { CobranzaService } from './cobranza.service';

const prisma = new PrismaClient();
const service = new CobranzaService(prisma as never);

async function dbDisponible(ctx: { skip: (msg?: string) => void }): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    ctx.skip('Base de datos no disponible');
    return false;
  }
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('CobranzaService.findAll (integración con SQL real)', () => {
  it('lista y pagina correctamente', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const result = await service.findAll(1, 10, {});
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    if (result.data.length > 0) {
      const row = result.data[0];
      expect(typeof row.total).toBe('number');
      expect(typeof row.pagado).toBe('number');
      expect(typeof row.estado_cobranza).toBe('string');
    }
  });

  it('filtra por estado_cobranza en SQL (pendiente/parcial/pagada/vencida)', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    for (const estado of ['pendiente', 'parcial', 'pagada', 'vencida']) {
      const result = await service.findAll(1, 5, { estado_cobranza: estado });
      expect(Array.isArray(result.data)).toBe(true);
      for (const row of result.data) {
        expect(row.estado_cobranza).toBe(estado);
      }
    }
  });

  it('estado_cobranza desconocido devuelve vacío', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const result = await service.findAll(1, 5, { estado_cobranza: 'no-existe' });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('búsqueda por texto q funciona', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const result = await service.findAll(1, 5, { q: 'a' });
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('pagina sin solapamiento entre páginas', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const p1 = await service.findAll(1, 5, {});
    const p2 = await service.findAll(2, 5, {});
    const ids1 = new Set(p1.data.map((r) => r.id_cotizacion));
    const solapes = p2.data.filter((r) => ids1.has(r.id_cotizacion));
    expect(solapes).toHaveLength(0);
  });
});

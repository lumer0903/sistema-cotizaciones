import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DashboardService } from './dashboard.service';

const prisma = new PrismaClient();
const service = new DashboardService(prisma as never);

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

describe('DashboardService (integración con SQL real)', () => {
  it('getKpis calcula los 4 KPIs', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const kpis = await service.getKpis();
    expect(typeof kpis.tasaConversion).toBe('number');
    expect(typeof kpis.efectividadIA).toBe('number');
    expect(typeof kpis.tiempoPromedioCotizacion).toBe('number');
    expect(typeof kpis.alertasStockActivas).toBe('number');
    expect(Number.isNaN(kpis.tasaConversion)).toBe(false);
    expect(Number.isNaN(kpis.tiempoPromedioCotizacion)).toBe(false);
  });

  it('getDetalleKpis devuelve estructura completa sin duplicar stats', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const detalle = await service.getDetalleKpis();
    expect(detalle.cotizaciones.total).toBeGreaterThanOrEqual(0);
    expect(detalle.cotizaciones.borrador + detalle.cotizaciones.enviada +
      detalle.cotizaciones.aprobada + detalle.cotizaciones.rechazada)
      .toBeLessThanOrEqual(detalle.cotizaciones.total);
    expect(detalle.graficos.cotizadoVsVendido).toHaveLength(6);
    expect(Array.isArray(detalle.alertasStock)).toBe(true);
  });

  it('gráfico cotizado vs vendido tiene 6 meses con números válidos', async (ctx) => {
    if (!(await dbDisponible(ctx))) return;
    const detalle = await service.getDetalleKpis();
    for (const mes of detalle.graficos.cotizadoVsVendido) {
      expect(typeof mes.mes).toBe('string');
      expect(Number.isNaN(mes.cotizado)).toBe(false);
      expect(Number.isNaN(mes.vendido)).toBe(false);
      expect(mes.cotizado).toBeGreaterThanOrEqual(0);
      expect(mes.vendido).toBeGreaterThanOrEqual(0);
    }
  });
});

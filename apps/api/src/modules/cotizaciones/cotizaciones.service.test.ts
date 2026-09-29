import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

function makeService(ops: { cot?: Record<string, any> | null } = {}) {
  const cot =
    ops.cot === undefined
      ? { id_cotizacion: 1, estado: 'borrador', subtotal: 40, costo_carreta: 15, total: 55 }
      : ops.cot;

  const update = vi.fn().mockResolvedValue({ id_cotizacion: 1 });
  const create = vi.fn().mockResolvedValue({ id_cotizacion: 1 });
  const findUnique = vi.fn().mockResolvedValue(cot);
  const findMany = vi.fn().mockResolvedValue([]);

  const tx = { cotizacion: { update, create } };
  const prisma: any = {
    cotizacion: { findUnique, findMany, count: vi.fn().mockResolvedValue(0), update, create },
    $transaction: vi.fn(async (fn: any) => fn(tx)),
  };

  const service = new CotizacionesService(prisma);
  return { service, prisma, update, create, findUnique };
}

const BASE_COT = { id_cotizacion: 1, estado: 'borrador', subtotal: 40, costo_carreta: 15, total: 55 };

describe('cambiarEstado (máquina de transiciones)', () => {
  it('rechaza estado vacío', async () => {
    const { service } = makeService();
    await expect(service.cambiarEstado(1, '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza estado fuera del catálogo', async () => {
    const { service } = makeService();
    await expect(service.cambiarEstado(1, 'pagada')).rejects.toThrow('Estado inválido');
  });

  it('404 si la cotización no existe', async () => {
    const { service } = makeService({ cot: null });
    await expect(service.cambiarEstado(99, 'enviada')).rejects.toBeInstanceOf(NotFoundException);
  });

  const permitidas: Array<[string, string]> = [
    ['borrador', 'enviada'],
    ['enviada', 'borrador'],
    ['enviada', 'aprobada'],
    ['enviada', 'parcialmente_pagada'],
    ['enviada', 'rechazada'],
    ['parcialmente_pagada', 'aprobada'],
    ['parcialmente_pagada', 'rechazada'],
    ['rechazada', 'borrador'],
  ];
  it.each(permitidas)('%s → %s permitida y persistida', async (desde, hacia) => {
    const { service, update } = makeService({ cot: { ...BASE_COT, estado: desde } });
    await service.cambiarEstado(1, hacia);
    expect(update).toHaveBeenCalledWith({
      where: { id_cotizacion: 1 },
      data:
        hacia === 'enviada'
          ? { estado: 'enviada', tiempo_fin: expect.any(Date) }
          : { estado: hacia },
    });
  });

  const prohibidas: Array<[string, string]> = [
    ['borrador', 'aprobada'],
    ['borrador', 'rechazada'],
    ['borrador', 'parcialmente_pagada'],
    ['aprobada', 'enviada'],
    ['aprobada', 'borrador'],
    ['aprobada', 'rechazada'],
    ['parcialmente_pagada', 'borrador'],
    ['parcialmente_pagada', 'enviada'],
    ['rechazada', 'enviada'],
    ['rechazada', 'aprobada'],
  ];
  it.each(prohibidas)('%s → %s prohibida (sin escritura)', async (desde, hacia) => {
    const { service, update } = makeService({ cot: { ...BASE_COT, estado: desde } });
    await expect(service.cambiarEstado(1, hacia)).rejects.toThrow(
      `Transición no permitida: "${desde}" → "${hacia}"`,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('noop: mismo estado no escribe en BD', async () => {
    const { service, update } = makeService({ cot: { ...BASE_COT, estado: 'enviada' } });
    const res = await service.cambiarEstado(1, 'enviada');
    expect(update).not.toHaveBeenCalled();
    expect(res).toEqual(expect.objectContaining({ estado: 'enviada' }));
  });

  it('al pasar a enviada escribe tiempo_fin (indicador de tesis)', async () => {
    const { service, update } = makeService({ cot: { ...BASE_COT, estado: 'borrador' } });
    await service.cambiarEstado(1, 'enviada');
    const data = update.mock.calls[0][0].data;
    expect(data.estado).toBe('enviada');
    expect(data.tiempo_fin).toBeInstanceOf(Date);
  });

  it('no pisa tiempo_fin si ya está escrito (reenvío)', async () => {
    const previo = new Date('2026-01-15T10:00:00Z');
    const { service, update } = makeService({
      cot: { ...BASE_COT, estado: 'borrador', tiempo_fin: previo },
    });
    await service.cambiarEstado(1, 'enviada');
    expect(update).toHaveBeenCalledWith({
      where: { id_cotizacion: 1 },
      data: { estado: 'enviada' },
    });
  });

  it('otros estados (p. ej. aprobada) no escriben tiempo_fin', async () => {
    const { service, update } = makeService({ cot: { ...BASE_COT, estado: 'enviada' } });
    await service.cambiarEstado(1, 'aprobada');
    expect(update).toHaveBeenCalledWith({
      where: { id_cotizacion: 1 },
      data: { estado: 'aprobada' },
    });
  });
});

describe('crear (validación de detalle)', () => {
  const lineaOk = { id_producto: 112, tipo_venta: 'mayor', cantidad: 2, precio_unitario: 10 };
  const base = { id_cliente: 7, numero: 'COT-999', detalle: [lineaOk] };

  it('exige id_cliente', async () => {
    const { service } = makeService();
    await expect(
      service.crear({ ...base, id_cliente: undefined } as unknown as CreateCotizacionDto, 1),
    ).rejects.toThrow('id_cliente es obligatorio');
  });

  it('exige al menos una línea', async () => {
    const { service } = makeService();
    await expect(service.crear({ ...base, detalle: [] }, 1)).rejects.toThrow(
      'al menos un producto',
    );
  });

  const detalleInvalido = [
    { caso: 'cantidad 0', linea: { ...lineaOk, cantidad: 0 } },
    { caso: 'cantidad negativa', linea: { ...lineaOk, cantidad: -1 } },
    { caso: 'precio negativo', linea: { ...lineaOk, precio_unitario: -5 } },
    { caso: 'id_producto 0', linea: { ...lineaOk, id_producto: 0 } },
  ];
  it.each(detalleInvalido)('rechaza $caso', async ({ linea }) => {
    const { service, create } = makeService();
    await expect(
      service.crear({ ...base, detalle: [linea] } as unknown as CreateCotizacionDto, 1),
    ).rejects.toThrow('Cada línea del detalle');
    expect(create).not.toHaveBeenCalled();
  });

  it('crea con subtotal y total calculados (incluye carreta)', async () => {
    const { service, create } = makeService();
    await service.crear(
      { ...base, incluye_carreta: true, costo_carreta: 15 } as unknown as CreateCotizacionDto,
      1,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'borrador', subtotal: 20, total: 35 }),
      }),
    );
  });

  it('incluye_carreta:false ignora costo_carreta en total y en lo almacenado', async () => {
    const { service, create } = makeService();
    await service.crear(
      { ...base, incluye_carreta: false, costo_carreta: 15 } as unknown as CreateCotizacionDto,
      1,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          incluye_carreta: false,
          costo_carreta: 0,
          subtotal: 20,
          total: 20,
        }),
      }),
    );
  });
});

describe('actualizar (carreta consistente y detalle)', () => {
  const borrador = { ...BASE_COT, estado: 'borrador' };
  const linea = { id_producto: 112, cantidad: 2, precio_unitario: 10 };

  it('no edita cotizaciones fuera de borrador', async () => {
    const { service } = makeService({ cot: { ...BASE_COT, estado: 'enviada' } });
    await expect(service.actualizar(1, {})).rejects.toThrow('BORRADOR');
  });

  it('rechaza detalle vacío', async () => {
    const { service } = makeService({ cot: borrador });
    await expect(service.actualizar(1, { detalle: [] })).rejects.toThrow('al menos un producto');
  });

  it('rechaza cantidad 0 en detalle', async () => {
    const { service } = makeService({ cot: borrador });
    await expect(
      service.actualizar(1, { detalle: [{ ...linea, cantidad: 0 }] } as unknown as UpdateCotizacionDto),
    ).rejects.toThrow('Cada línea del detalle');
  });

  it('incluye_carreta:true sin costo conserva el costo actual (no queda en 0)', async () => {
    const { service, update } = makeService({ cot: borrador });
    await service.actualizar(
      1,
      { incluye_carreta: true, detalle: [linea] } as unknown as UpdateCotizacionDto,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 20, total: 35 }),
      }),
    );
  });

  it('incluye_carreta:false deja la carreta en 0', async () => {
    const { service, update } = makeService({ cot: borrador });
    await service.actualizar(
      1,
      { incluye_carreta: false, detalle: [linea] } as unknown as UpdateCotizacionDto,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 20, total: 20, incluye_carreta: false }),
      }),
    );
  });

  it('incluye_carreta:true con costo usa ese costo', async () => {
    const { service, update } = makeService({ cot: borrador });
    await service.actualizar(
      1,
      { incluye_carreta: true, costo_carreta: 8, detalle: [linea] } as unknown as UpdateCotizacionDto,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ costo_carreta: 8, total: 28 }),
      }),
    );
  });

  it('sin cambios de detalle conserva subtotal y suma la carreta actual', async () => {
    const { service, update } = makeService({ cot: borrador });
    await service.actualizar(1, { observaciones: 'vencimiento ampliado' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subtotal: 40, total: 55 }),
      }),
    );
  });
});

describe('registrarPago (guardrails)', () => {
  it('rechaza pagos en borrador', async () => {
    const { service } = makeService({ cot: { ...BASE_COT, estado: 'borrador' } });
    await expect(
      service.registrarPago(1, { monto: 10, metodo_pago: 'efectivo' }, 1),
    ).rejects.toThrow('No se pueden registrar pagos');
  });

  it('rechaza monto que excede el saldo', async () => {
    const { service, prisma } = makeService({ cot: { ...BASE_COT, estado: 'enviada', total: 50 } });
    prisma.cotizacionPago = { findMany: vi.fn().mockResolvedValue([{ monto: 40 }]) };
    await expect(
      service.registrarPago(1, { monto: 20, metodo_pago: 'efectivo' }, 1),
    ).rejects.toThrow('excede el saldo');
  });

  it('pago total marca la cotización como aprobada', async () => {
    const { service, prisma, update } = makeService({
      cot: { ...BASE_COT, estado: 'enviada', total: 50 },
    });
    prisma.cotizacionPago = { findMany: vi.fn().mockResolvedValue([]) };
    const pagoCreate = vi.fn();
    prisma.$transaction = vi.fn(async (fn: any) =>
      fn({ cotizacion: { update }, cotizacionPago: { create: pagoCreate } }),
    );
    await service.registrarPago(1, { monto: 50, metodo_pago: 'efectivo' }, 1);
    expect(pagoCreate).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id_cotizacion: 1 },
      data: { estado: 'aprobada' },
    });
  });

  it('pago parcial marca parcialmente_pagada', async () => {
    const { service, prisma, update } = makeService({
      cot: { ...BASE_COT, estado: 'enviada', total: 50 },
    });
    prisma.cotizacionPago = { findMany: vi.fn().mockResolvedValue([]) };
    const pagoCreate = vi.fn();
    prisma.$transaction = vi.fn(async (fn: any) =>
      fn({ cotizacion: { update }, cotizacionPago: { create: pagoCreate } }),
    );
    await service.registrarPago(
      1,
      { monto: 20, metodo_pago: 'yape' } as unknown as RegistrarPagoDto,
      1,
    );
    expect(update).toHaveBeenCalledWith({
      where: { id_cotizacion: 1 },
      data: { estado: 'parcialmente_pagada' },
    });
  });
});

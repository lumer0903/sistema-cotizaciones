import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, MetodoPago } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verificarAlcance } from './alcance.util';

export interface PagoInput {
  monto: number;
  metodo_pago: string;
  referencia?: string | null;
  clave_idempotencia?: string;
}

/** El bloqueo precede a la lectura de saldo en ambas rutas de pago. */
export async function registrarPagoSeguro(prisma: PrismaService, id: number, data: PagoInput, idUsuario: number, alcance: number | null) {
  if (!data || !Number.isFinite(data.monto) || data.monto <= 0 || Math.abs(data.monto * 100 - Math.round(data.monto * 100)) > 0.000001) {
    throw new BadRequestException('El monto debe ser mayor a 0 y tener como máximo dos decimales');
  }
  if (!Object.values(MetodoPago).includes(data.metodo_pago as MetodoPago)) throw new BadRequestException('Metodo de pago inválido');
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id_cotizacion FROM cotizaciones WHERE id_cotizacion = ${id} FOR UPDATE`);
    const cot = await tx.cotizacion.findUnique({ where: { id_cotizacion: id } });
    if (!cot) throw new NotFoundException('Cotización no encontrada');
    verificarAlcance(alcance, cot.id_usuario);
    if (data.clave_idempotencia) {
      const previo = await tx.cotizacionPago.findUnique({ where: { id_cotizacion_clave_idempotencia: { id_cotizacion: id, clave_idempotencia: data.clave_idempotencia } } });
      if (previo) {
        if (!previo.monto.equals(data.monto) || previo.metodo_pago !== data.metodo_pago || (previo.referencia ?? null) !== (data.referencia || null)) {
          throw new ConflictException('La clave de pago ya se utilizó con otros datos');
        }
        return;
      }
    }
    if (!['enviada', 'aprobada', 'parcialmente_pagada'].includes(cot.estado)) throw new BadRequestException('No se pueden registrar pagos en este estado');
    const suma = await tx.cotizacionPago.aggregate({ where: { id_cotizacion: id }, _sum: { monto: true } });
    const pagado = suma._sum.monto ?? new Prisma.Decimal(0);
    const monto = new Prisma.Decimal(data.monto);
    if (monto.greaterThan(new Prisma.Decimal(cot.total).minus(pagado))) throw new BadRequestException('El monto excede el saldo pendiente');
    await tx.cotizacionPago.create({ data: {
      id_cotizacion: id, id_usuario: idUsuario, monto,
      metodo_pago: data.metodo_pago as MetodoPago, referencia: data.referencia || null,
      clave_idempotencia: data.clave_idempotencia,
    } });
    await tx.cotizacion.update({ where: { id_cotizacion: id }, data: {
      estado: pagado.plus(monto).greaterThanOrEqualTo(cot.total) ? 'aprobada' : 'parcialmente_pagada',
    } });
  });
}

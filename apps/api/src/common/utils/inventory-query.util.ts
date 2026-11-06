import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MovementFilterDto } from '../dto/inventory-query.dto';
export function startOfLimaDay(value: string): Date {
  const day = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0,10) !== value)
    throw new BadRequestException('Fecha de calendario inválida');
  return new Date(day.getTime() + 5 * 3600000);
}
export function movementWhere(q: MovementFilterDto): Prisma.InventarioMovimientoWhereInput {
  if(q.tipo==='transferencia' && q.origen && q.origen!=='transferencia') throw new BadRequestException('Filtros tipo/origen incompatibles');
  const start = q.fecha_inicio ? startOfLimaDay(q.fecha_inicio) : undefined;
  const end = q.fecha_fin ? startOfLimaDay(q.fecha_fin) : undefined;
  if (start && end && start > end) throw new BadRequestException('Rango de fechas invertido');
  const where: Prisma.InventarioMovimientoWhereInput = {
    id_producto: q.id_producto, id_almacen: q.id_almacen,
    ...(q.tipo === 'transferencia' ? { origen: 'transferencia' } : { tipo: q.tipo, origen: q.origen }),
  };
  if (start || end) where.created_at = {
    ...(start ? { gte: start } : {}), ...(end ? { lt: new Date(end.getTime()+86400000) } : {}),
  };
  return where;
}
export function csvText(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g,'""') + '"';
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { startOfLimaDay } from '../../common/utils/inventory-query.util';
import { HistoryQueryDto } from '../precios/pricing.dto';
const select = { id_historial: true, id_producto: true, id_usuario: true, campo_modificado: true, valor_anterior: true, valor_nuevo: true, fecha_cambio: true,
    evento: true, actor_nombre: true, motivo: true, producto: { select: { id_producto: true, codigo: true, descripcion: true } }, usuario: { select: { id_usuario: true, nombre: true } } } as const;
type Entry = Prisma.HistorialPreciosGetPayload<{
    select: typeof select;
}>;
const map = (item: Entry) => ({ ...item, valor_anterior: item.valor_anterior.toFixed(2), valor_nuevo: item.valor_nuevo.toFixed(2),
    delta: item.valor_nuevo.minus(item.valor_anterior).toFixed(2) });
export type HistorialPrecioResponse = ReturnType<typeof map>;
export interface PaginatedHistorialPreciosResponse {
    data: HistorialPrecioResponse[];
    total: number | null;
    page: number;
    limit: number;
    next_cursor: string | null;
}
@Injectable()
export class HistorialPreciosService {
    constructor(private readonly prisma: PrismaService) { }
    async findAll(page = 1, limit = 50, filters: Partial<HistoryQueryDto> = {}): Promise<PaginatedHistorialPreciosResponse> {
        const start = filters.fecha_inicio ? startOfLimaDay(filters.fecha_inicio) : undefined;
        const end = filters.fecha_fin ? new Date(startOfLimaDay(filters.fecha_fin).getTime() + 86400000) : undefined;
        if (start && end && start >= end)
            throw new BadRequestException('Rango de fechas invertido');
        const base: Prisma.HistorialPreciosWhereInput = { id_producto: filters.id_producto, id_usuario: filters.id_usuario,
            campo_modificado: filters.campo_modificado, ...(start || end ? { fecha_cambio: { gte: start, lt: end } } : {}) };
        return this.prisma.$transaction(async (tx) => {
            const where: Prisma.HistorialPreciosWhereInput = { ...base };
            if (filters.cursor) {
                if (page !== 1 || !/^[1-9]\d*$/.test(filters.cursor) || !Number.isSafeInteger(Number(filters.cursor)) || Number(filters.cursor) > 2147483647)
                    throw new BadRequestException('Cursor inválido; utilice page=1');
                const anchor = await tx.historialPrecios.findFirst({ where: { ...base, id_historial: Number(filters.cursor) }, select: { fecha_cambio: true, id_historial: true } });
                if (!anchor)
                    throw new BadRequestException('Cursor no pertenece al filtro');
                where.OR = [{ fecha_cambio: { lt: anchor.fecha_cambio } }, { fecha_cambio: anchor.fecha_cambio, id_historial: { lt: anchor.id_historial } }];
            }
            const [rows, total] = await Promise.all([tx.historialPrecios.findMany({ where, select, take: limit + 1,
                    skip: filters.cursor ? 0 : (page - 1) * limit, orderBy: [{ fecha_cambio: 'desc' }, { id_historial: 'desc' }] }),
                filters.incluir_total === false ? Promise.resolve(null) : tx.historialPrecios.count({ where: base })]);
            const data = rows.slice(0, limit);
            return { data: data.map(map), total, page, limit, next_cursor: rows.length > limit ? String(data[data.length - 1].id_historial) : null };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    }
    async findById(id: number) {
        const item = await this.prisma.historialPrecios.findUnique({ where: { id_historial: id }, select });
        if (!item)
            throw new NotFoundException('Registro de historial no encontrado');
        return map(item);
    }
}

import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { setPriceActor, SALE_FIELDS } from '../../common/utils/precios.util';
const literalSearch=(value:string)=>value.trim().replace(/[\\%_]/g,'\\import { BulkPricingDto');
import { BulkPricingDto, PricingQueryDto, PricingCategoriesQueryDto } from './pricing.dto';
@Injectable()
export class PricingService {
    constructor(private readonly prisma: PrismaService) { }
    async categories(q: PricingCategoriesQueryDto) {
        const where: Prisma.CategoriaWhereInput = q.search?.trim() ? { nombre_categoria: { contains: literalSearch(q.search), mode: 'insensitive' } } : {};
        const [data, total] = await this.prisma.$transaction([this.prisma.categoria.findMany({ where, select: { id_categoria: true, nombre_categoria: true }, orderBy: { id_categoria: 'asc' }, take: q.limit, skip: (q.page - 1) * q.limit }), this.prisma.categoria.count({ where })], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
        return { data, total, page: q.page, limit: q.limit };
    }
    async list(q: PricingQueryDto) {
        if ((q.precio_min !== undefined || q.precio_max !== undefined) && !q.tipo_precio)
            throw new BadRequestException('Seleccione una tarifa para filtrar importes');
        if (q.precio_min !== undefined && q.precio_max !== undefined && q.precio_min > q.precio_max)
            throw new BadRequestException('Rango de precios invertido');
        const where: Prisma.ProductoWhereInput = { deleted_at: null, activo: q.activo, id_categoria: q.id_categoria };
        if (q.search?.trim())
            where.OR = [{ codigo: { contains: literalSearch(q.search), mode: 'insensitive' } }, { descripcion: { contains: literalSearch(q.search), mode: 'insensitive' } }];
        if (q.tipo_precio)
            where.precios_actuales = { is: { [q.tipo_precio]: { gte: q.precio_min, lte: q.precio_max } } };
        if (q.stock_status === 'agotado')
            where.stock_total = 0;
        if (q.stock_status === 'bajo')
            where.AND = [{ stock_total: { gt: 0 } }, { stock_total: { lte: this.prisma.producto.fields.stock_minimo } }];
        if (q.stock_status === 'disponible')
            where.stock_total = { gt: this.prisma.producto.fields.stock_minimo };
        const priceSelect = Object.fromEntries(SALE_FIELDS.map(f => [f, true]));
        return this.prisma.$transaction(async (tx) => {
            const [data, total] = await Promise.all([tx.producto.findMany({ where,
                    select: { id_producto: true, codigo: true, descripcion: true, foto_url: true, stock_total: true, stock_minimo: true, activo: true, id_categoria: true,
                        categoria: { select: { nombre_categoria: true } }, precios_actuales: { select: priceSelect } },
                    orderBy: [{ created_at: 'desc' }, { id_producto: 'desc' }], skip: (q.page - 1) * q.limit, take: q.limit }),
                tx.producto.count({ where })]);
            return { success: true, data: data.map(p => {
                    const { precios_actuales, ...rest } = p;
                    return { ...rest,
                        precios: precios_actuales ? Object.fromEntries(SALE_FIELDS.map(f => [f, (precios_actuales as unknown as Record<string, Prisma.Decimal>)[f].toFixed(2)])) : null };
                }), total, page: q.page, limit: q.limit };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    }
    async bulk(dto: BulkPricingDto, actor: number, attempt = 0): Promise<Prisma.JsonValue> {
        // Atomic category adjustment with bounded memory. An advisory lock serializes retries.
        return this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw `SELECT pg_advisory_xact_lock(hashtextextended(${dto.clave},0))`;
            const previous = await tx.$queryRaw<Array<{
                id_usuario: number;
                solicitud: Prisma.JsonValue;
                resultado: Prisma.JsonValue;
            }>> `
    SELECT id_usuario,solicitud,resultado FROM precio_ajustes_lotes WHERE clave=${dto.clave}::uuid`;
            const request = JSON.stringify({ id_categoria: dto.id_categoria ?? null, campos: [...dto.campos].sort(), porcentaje: dto.porcentaje, motivo: dto.motivo });
            if (previous.length) {
                if (previous[0].id_usuario !== actor || JSON.stringify(previous[0].solicitud) !== JSON.stringify(JSON.parse(request))) {
                    // JSONB key order is not stable: compare the JSON values in PostgreSQL.
                    const same = await tx.$queryRaw<Array<{
                        same: boolean;
                    }>> `SELECT solicitud=${request}::jsonb AND id_usuario=${actor} AS same FROM precio_ajustes_lotes WHERE clave=${dto.clave}::uuid`;
                    if (!same[0]?.same)
                        throw new ConflictException('Clave reutilizada con otra solicitud');
                }
                return previous[0].resultado;
            }
            // Lock the target snapshot in id order; the SQL update returns only a count.
            await tx.$queryRaw `SELECT count(*) FROM (SELECT a.id_producto FROM precios_actuales a JOIN productos p ON p.id_producto=a.id_producto
    WHERE p.deleted_at IS NULL AND (${dto.id_categoria ?? null}::int IS NULL OR p.id_categoria=${dto.id_categoria ?? null}::int)
    ORDER BY a.id_producto FOR UPDATE OF a) locked`;
            if (dto.campos.some(f => !SALE_FIELDS.includes(f)))
                throw new BadRequestException('Tarifa inválida');
            const missing = await tx.producto.count({ where: { deleted_at: null, id_categoria: dto.id_categoria, precios_actuales: { is: null } } });
            if (missing)
                throw new BadRequestException('Hay productos sin precios');
            await setPriceActor(tx, actor, dto.motivo);
            const factor = new Prisma.Decimal(1).plus(new Prisma.Decimal(dto.porcentaje).div(100)).toFixed();
            const assignments = Prisma.join(dto.campos.map(f => Prisma.sql `${Prisma.raw(f)}=ROUND(a.${Prisma.raw(f)}*${factor}::numeric,2)`));
            const differences=Prisma.join(dto.campos.map(f=>Prisma.sql`a.${Prisma.raw(f)} IS DISTINCT FROM ROUND(a.${Prisma.raw(f)}*${factor}::numeric,2)`),' OR ');
            const changed = await tx.$queryRaw<Array<{
                total: bigint;
            }>>(Prisma.sql `WITH changed AS (
    UPDATE precios_actuales a SET ${assignments},updated_at=now() FROM productos p
    WHERE p.id_producto=a.id_producto AND p.deleted_at IS NULL
      AND (${dto.id_categoria ?? null}::int IS NULL OR p.id_categoria=${dto.id_categoria ?? null}::int)
      AND (${differences})
    RETURNING a.id_producto) SELECT count(*) AS total FROM changed`);
            const updated = Number(changed[0].total);
            const result = JSON.stringify({ success: true, actualizados: updated, clave: dto.clave });
            await tx.$executeRaw `INSERT INTO precio_ajustes_lotes(clave,id_usuario,solicitud,resultado) VALUES(${dto.clave}::uuid,${actor},${request}::jsonb,${result}::jsonb)`;
            return JSON.parse(result);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 120000, maxWait: 10000 }).catch(error => {
            if (error?.meta?.code === '23514' || error?.meta?.code === '22003')
                throw new BadRequestException('El ajuste supera los límites o la jerarquía de tarifas');
            if ((error?.code === 'P2034' || ['40001', '40P01'].includes(error?.meta?.code)) && attempt < 2)
                return this.bulk(dto, actor, attempt + 1);
            if (error?.code === 'P2034' || ['40001', '40P01'].includes(error?.meta?.code))
                throw new ConflictException('Los precios cambiaron durante el ajuste. Reintente con la misma clave');
            throw error;
        });
    }
}

import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
export const PRICE_FIELDS = ['costo_normal', 'precio_unidad_normal', 'precio_docena_normal', 'precio_mayor_normal', 'costo_distribuidor', 'precio_unidad_dist', 'precio_docena_dist', 'precio_mayor_dist'] as const;
export const SALE_FIELDS = PRICE_FIELDS.filter(f => f.startsWith('precio_'));
export type PriceField = typeof PRICE_FIELDS[number];
export function decimalMoney(value: unknown): Prisma.Decimal {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        (typeof value === 'string' && !/^\d+(\.\d{1,2})?$/.test(value)))
        throw new BadRequestException('Importe inválido');
    const d = new Prisma.Decimal(value);
    if (!d.isFinite() || d.lt(0) || d.gt('99999999.99') || d.decimalPlaces() > 2)
        throw new BadRequestException('Importe fuera de rango o precisión');
    return d;
}
export async function setPriceActor(tx: Prisma.TransactionClient, actorId: number, reason = 'Edición de precios') {
    if (!Number.isInteger(actorId) || actorId < 1)
        throw new BadRequestException('Actor requerido');
    const rows = await tx.$queryRaw<Array<{
        valid: boolean;
    }>> `SELECT set_config('app.actor_id',${String(actorId)},true), set_config('app.price_reason',${reason},true), EXISTS(SELECT 1 FROM usuarios WHERE id_usuario=${actorId} AND activo=true AND deleted_at IS NULL) AS valid`;
    if (!rows[0]?.valid)
        throw new BadRequestException('Actor válido requerido para modificar precios');
}
/** El trigger PostgreSQL registra todos los escritores, sin duplicar el ledger. */
export async function guardarPreciosAuditados(tx: Prisma.TransactionClient, id: number, data: Partial<Record<PriceField, unknown>>, actorId: number, reason?: string) {
    const entries = PRICE_FIELDS.flatMap(field => data[field] === undefined ? [] : [[field, decimalMoney(data[field])] as const]);
    if (!entries.length)
        return;
    await setPriceActor(tx, actorId, reason);
    const current = await tx.preciosActuales.findUnique({ where: { id_producto: id } });
    const patch = Object.fromEntries(entries);
    const merged = Object.fromEntries(PRICE_FIELDS.map(f => [f, patch[f] ?? current?.[f] ?? new Prisma.Decimal(0)]));
    for (const [unit, dozen, major] of [['precio_unidad_normal', 'precio_docena_normal', 'precio_mayor_normal'], ['precio_unidad_dist', 'precio_docena_dist', 'precio_mayor_dist']]) {
        if (merged[unit].lt(merged[dozen]) || merged[dozen].lt(merged[major]))
            throw new BadRequestException('La tarifa por unidad debe ser mayor o igual a docena y mayor');
    }
    if (current && entries.every(([f, v]) => current[f].equals(v)))
        return;
    return tx.preciosActuales.upsert({ where: { id_producto: id }, create: { id_producto: id, ...patch }, update: patch });
}

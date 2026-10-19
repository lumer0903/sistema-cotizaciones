import { Prisma } from '@prisma/client';
/** Serializa todas las mutaciones del inventario de un producto. */
export async function bloquearProducto(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw(Prisma.sql`SELECT id_producto FROM productos WHERE id_producto = ${id} FOR UPDATE`);
}
export async function sincronizarStock(tx: Prisma.TransactionClient, id: number) {
  const stocks = await tx.stockActual.findMany({ where: { id_producto: id }, select: { cantidad: true, almacen: { select: { codigo: true } } } });
  await tx.producto.update({ where: { id_producto: id }, data: {
    stock_total: stocks.reduce((n, s) => n + s.cantidad, 0),
    stock_principal: stocks.filter(s => s.almacen.codigo === 'ALM-001').reduce((n, s) => n + s.cantidad, 0),
  } });
}

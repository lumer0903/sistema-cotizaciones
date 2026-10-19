import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
export async function bloquearProducto(tx: Prisma.TransactionClient, id: number) {
  await tx.$queryRaw(Prisma.sql`SELECT id_producto FROM productos WHERE id_producto = ${id} FOR NO KEY UPDATE`);
  const product = await tx.producto.findUnique({where:{id_producto:id},select:{deleted_at:true}});
  if (!product || product.deleted_at) throw new NotFoundException('Producto no encontrado');
}
/** Una alerta mutable por producto/almacén. Reconocer no resuelve stock bajo. */
export async function sincronizarAlertas(tx: Prisma.TransactionClient, id: number) {
  const p = await tx.producto.findUniqueOrThrow({where:{id_producto:id},select:{stock_minimo:true,deleted_at:true}});
  const stocks = await tx.stockActual.findMany({where:{id_producto:id},select:{id_almacen:true,cantidad:true}});
  for (const s of stocks) {
    const where = {id_producto_id_almacen:{id_producto:id,id_almacen:s.id_almacen}};
    const existing = await tx.alertas_stock.findUnique({where});
    if (s.cantidad <= p.stock_minimo && !p.deleted_at) {
      const recognized = existing?.estado === 'reconocida';
      await tx.alertas_stock.upsert({where,create:{
        id_producto:id,id_almacen:s.id_almacen,stock_actual:s.cantidad,stock_minimo:p.stock_minimo,
      },update:{stock_actual:s.cantidad,stock_minimo:p.stock_minimo,
        estado:recognized?'reconocida':'activa',reconocida_at:recognized?existing.reconocida_at:null}});
    } else if (existing) {
      await tx.alertas_stock.update({where,data:{stock_actual:s.cantidad,stock_minimo:p.stock_minimo,estado:'resuelta'}});
    }
  }
}
export async function sincronizarStock(tx: Prisma.TransactionClient, id: number) {
  const stocks = await tx.stockActual.findMany({ where: { id_producto:id },select:{cantidad:true,almacen:{select:{codigo:true}}} });
  const total=stocks.reduce((n,s)=>n+s.cantidad,0);
  if(total>2147483647)throw new BadRequestException("Stock supera la capacidad admitida");
  await tx.producto.update({where:{id_producto:id},data:{
    stock_total:total,
    stock_principal:stocks.filter(s=>s.almacen.codigo==='ALM-001').reduce((n,s)=>n+s.cantidad,0),
  }});
  await sincronizarAlertas(tx,id);
}

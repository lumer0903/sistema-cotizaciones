import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando consolidación de almacenes a solo "CENTRO"...');

  // 1. Find the CENTRO warehouse (ALM-001 / Lima Centro)
  const centro = await prisma.almacen.findFirst({
    where: { codigo: 'ALM-001' },
  });

  if (!centro) {
    throw new Error('No se encontró el almacén ALM-001 (Lima Centro)');
  }

  console.log(`Almacén CENTRO encontrado: ${centro.nombre} (id: ${centro.id_almacen})`);

  // 2. Get all other warehouses
  const otrosAlmacenes = await prisma.almacen.findMany({
    where: { id_almacen: { not: centro.id_almacen } },
  });

  console.log(`Encontrados ${otrosAlmacenes.length} almacenes adicionales para desactivar/consolidar`);

  // 3. For each product, consolidate stock from other warehouses into CENTRO
  const productos = await prisma.producto.findMany({
    where: { deleted_at: null },
    select: { id_producto: true, stock_principal: true, stock_total: true },
  });

  console.log(`Procesando ${productos.length} productos...`);

  for (const prod of productos) {
    // Sum all stock from all warehouses for this product
    const stocks = await prisma.stockActual.findMany({
      where: { id_producto: prod.id_producto },
    });

    const totalStock = stocks.reduce((sum, s) => sum + s.cantidad, 0);

    // Delete all stock_actual records for this product
    await prisma.stockActual.deleteMany({
      where: { id_producto: prod.id_producto },
    });

    // Create/update single stock_actual for CENTRO with total
    await prisma.stockActual.upsert({
      where: {
        id_producto_id_almacen: {
          id_producto: prod.id_producto,
          id_almacen: centro.id_almacen,
        },
      },
      update: { cantidad: totalStock },
      create: {
        id_producto: prod.id_producto,
        id_almacen: centro.id_almacen,
        cantidad: totalStock,
      },
    });

    // Update product stock_total and stock_principal
    await prisma.producto.update({
      where: { id_producto: prod.id_producto },
      data: {
        stock_total: totalStock,
        stock_principal: totalStock,
      },
    });

    console.log(`  Producto ${prod.id_producto}: stock consolidado = ${totalStock}`);
  }

  // 4. Deactivate other warehouses (keep CENTRO active)
  for (const alm of otrosAlmacenes) {
    await prisma.almacen.update({
      where: { id_almacen: alm.id_almacen },
      data: { activo: false },
    });
    console.log(`  Desactivado: ${alm.nombre} (${alm.codigo})`);
  }

  // 5. Ensure CENTRO is active
  await prisma.almacen.update({
    where: { id_almacen: centro.id_almacen },
    data: { activo: true, nombre: 'CENTRO', codigo: 'ALM-001', ubicacion: 'Almacén Central' },
  });
  console.log(`  CENTRO actualizado: ${centro.nombre} -> CENTRO`);

  // 6. Clean up alertas_stock for deactivated warehouses
  const desactivadosIds = otrosAlmacenes.map(a => a.id_almacen);
  if (desactivadosIds.length > 0) {
    await prisma.alertas_stock.deleteMany({
      where: { id_almacen: { in: desactivadosIds } },
    });
    console.log(`  Alertas de stock limpiadas para almacenes desactivados`);
  }

  console.log('✅ Consolidación completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
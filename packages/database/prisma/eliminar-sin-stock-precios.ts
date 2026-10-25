import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const candidatos = await prisma.$queryRaw<Array<{ id_producto: number; codigo: string }>>`
    SELECT pr.id_producto, pr.codigo FROM productos pr
    WHERE pr.deleted_at IS NULL
      AND COALESCE((SELECT s.cantidad FROM stock_actual s WHERE s.id_producto = pr.id_producto AND s.id_almacen = 1), 0) = 0
      AND NOT EXISTS (SELECT 1 FROM precios_actuales pa WHERE pa.id_producto = pr.id_producto)`;

  console.log(`Productos a eliminar (soft delete): ${candidatos.length}`);
  for (const c of candidatos) console.log(`  - ${c.codigo} (id ${c.id_producto})`);

  const result = await prisma.producto.updateMany({
    where: {
      deleted_at: null,
      id_producto: { in: candidatos.map((c) => c.id_producto) },
    },
    data: { deleted_at: new Date() },
  });
  console.log(`Eliminados: ${result.count}`);

  const restantes = await prisma.producto.count({ where: { deleted_at: null } });
  console.log(`Productos activos restantes: ${restantes}`);
}

main()
  .catch((e) => { console.error(e); throw e; })
  .finally(async () => { await prisma.$disconnect(); });
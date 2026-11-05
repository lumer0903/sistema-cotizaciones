import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const minPorCategoria = await prisma.$queryRaw<Array<{ id_categoria: number; min_stock: bigint }>>`
    SELECT pr.id_categoria,
      min(COALESCE((SELECT s.cantidad FROM stock_actual s WHERE s.id_producto = pr.id_producto AND s.id_almacen = 1), 0)) AS min_stock
    FROM productos pr
    WHERE pr.deleted_at IS NULL AND pr.id_categoria IS NOT NULL
    GROUP BY pr.id_categoria`;

  console.log('Minimo de stock por categoria:');
  for (const c of minPorCategoria) {
    console.log(`  categoria ${c.id_categoria}: stock_minimo = ${Number(c.min_stock)}`);
  }

  let total = 0;
  for (const c of minPorCategoria) {
    const r = await prisma.producto.updateMany({
      where: { deleted_at: null, id_categoria: c.id_categoria },
      data: { stock_minimo: Number(c.min_stock) },
    });
    console.log(`  -> categoria ${c.id_categoria}: ${r.count} productos actualizados`);
    total += r.count;
  }
  console.log(`Total productos actualizados: ${total}`);

  const verificacion = await prisma.$queryRaw<Array<{ nombre: string; n: bigint; sm_min: bigint; sm_max: bigint }>>`
    SELECT c.nombre_categoria AS nombre, count(pr.id_producto) AS n,
      min(pr.stock_minimo) AS sm_min, max(pr.stock_minimo) AS sm_max
    FROM productos pr JOIN categorias c ON c.id_categoria = pr.id_categoria
    WHERE pr.deleted_at IS NULL
    GROUP BY c.id_categoria, c.nombre_categoria ORDER BY c.id_categoria`;
  console.log('Verificacion:');
  for (const v of verificacion) {
    console.log(`  ${v.nombre}: ${Number(v.n)} productos | stock_minimo min=${Number(v.sm_min)} max=${Number(v.sm_max)}`);
  }
}

main()
  .catch((e) => { console.error(e); throw e; })
  .finally(async () => { await prisma.$disconnect(); });
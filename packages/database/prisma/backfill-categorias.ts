import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_MAP: { id: number; presentations: string[] }[] = [
  { id: 1, presentations: ['Ramo', 'Bouquet', 'Ramo con Follaje'] },
  { id: 2, presentations: ['Vara'] },
  { id: 3, presentations: ['Adorno', 'Corona', 'Guia', 'Planta', 'Reja', 'Panel', 'Rosas', 'Unitario', 'Follaje', '-', ''] },
  { id: 4, presentations: ['Florero', 'Macetero', 'Pedestal', 'Arbol'] },
];

function getCategoryIdByPresentacion(presentacion: string | null): number {
  const clean = presentacion?.trim() || '';
  for (const cat of CATEGORY_MAP) {
    if (cat.presentations.includes(clean)) return cat.id;
  }
  return 3;
}

async function main() {
  console.log('Backfilling id_categoria desde presentacion...');

  const sinCategoria = await prisma.producto.findMany({
    where: { deleted_at: null, id_categoria: null },
    select: { id_producto: true, codigo: true, presentacion: true },
  });
  console.log(`Productos sin categoria: ${sinCategoria.length}`);

  const dist: Record<number, number> = {};
  let processed = 0;
  for (const prod of sinCategoria) {
    const id_categoria = getCategoryIdByPresentacion(prod.presentacion);
    await prisma.producto.update({
      where: { id_producto: prod.id_producto },
      data: { id_categoria },
    });
    dist[id_categoria] = (dist[id_categoria] || 0) + 1;
    processed++;
    if (processed % 500 === 0) console.log(`  ${processed}/${sinCategoria.length}`);
  }

  console.log('Distribucion asignada:', JSON.stringify(dist));
  console.log('Backfill completado.');
}

main()
  .catch((e) => { console.error(e); throw e; })
  .finally(async () => { await prisma.$disconnect(); });
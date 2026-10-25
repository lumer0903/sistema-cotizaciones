const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.\$transaction([
  prisma.producto.findFirst({ select: { id_producto: true, codigo: true, foto_url: true, descripcion: true, activo: true } }),
  prisma.\$count('producto')
]).then(([product, count]) => {
  console.log('Product sample:', product);
  console.log('Total products:', count);
  prisma.\$disconnect();
}).catch(e => { console.error(e); prisma.\$disconnect(); });
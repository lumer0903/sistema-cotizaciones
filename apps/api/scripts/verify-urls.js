const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.producto.findMany({ select: { id_producto: true, codigo: true, foto_url: true }, take: 5 })
  .then(products => {
    products.forEach(p => console.log(p.codigo, '->', p.foto_url));
    prisma.$disconnect();
  })
  .catch(e => { console.error(e); prisma.$disconnect(); });
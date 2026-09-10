const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT * FROM usuarios');
  console.log('Usuarios RAW:', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());

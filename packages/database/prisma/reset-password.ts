import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const nuevaPassword = process.env.NEW_PASSWORD;

  if (!email || !nuevaPassword) {
    console.error('Uso: NEW_PASSWORD=<secret> pnpm db:reset-password -- <email>');
    process.exit(1);
  }
  if (nuevaPassword.length < 6) {
    console.error('NEW_PASSWORD debe tener al menos 6 caracteres');
    process.exit(1);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    console.error(`No existe el usuario ${email}`);
    process.exit(1);
  }

  await prisma.usuario.update({
    where: { email },
    data: { password_hash: await bcrypt.hash(nuevaPassword, 12) },
  });
  console.log(`Password actualizado para ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

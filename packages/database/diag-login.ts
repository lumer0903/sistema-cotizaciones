import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.$queryRawUnsafe<any>(
    `SELECT email, activo, deleted_at, rol, left(password_hash,7) AS hash_pref,
            (session_version IS NOT NULL) AS tiene_session_version,
            (refresh_token_hash IS NOT NULL) AS tiene_refresh_hash
     FROM usuarios WHERE lower(email) = 'admin@goldcontinent.com'`
  );
  console.log('USUARIO_ADMIN:', JSON.stringify(admin, null, 2));

  const roles = await prisma.$queryRawUnsafe<any>(
    `SELECT codigo, activo FROM roles ORDER BY codigo`
  );
  console.log('ROLES:', JSON.stringify(roles, null, 2));

  const permisos = await prisma.$queryRawUnsafe<any>(
    `SELECT count(*)::int AS permisos_admin FROM rol_permisos rp
     JOIN roles r ON r.codigo = rp.rol_codigo WHERE r.codigo = 'admin'`
  );
  console.log('PERMISOS_ADMIN:', JSON.stringify(permisos, null, 2));

  const totalUsers = await prisma.$queryRawUnsafe<any>(
    `SELECT count(*)::int AS total FROM usuarios`
  );
  console.log('TOTAL_USUARIOS:', JSON.stringify(totalUsers, null, 2));
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

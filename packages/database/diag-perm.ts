import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  for (const r of ['authenticated', 'anonymous', 'neondb_owner', 'neon_service']) {
    try {
      const g = await p.$queryRawUnsafe<any>(
        `SELECT table_name, string_agg(privilege_type, ',') AS privs
         FROM information_schema.role_table_grants WHERE grantee = $1
         GROUP BY table_name ORDER BY table_name`
      , r as any);
      console.log(`GRANTS ${r}:`, JSON.stringify(g, null, 1));
    } catch (e: any) { console.log(`E_${r}:`, e.message); }
  }
  try {
    const m = await p.$queryRawUnsafe<any>(
      `SELECT r.rolname::text AS role, b.rolname::text AS granted_role
       FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles b ON b.oid=m.roleid
       WHERE b.rolname IN ('authenticated','anonymous','neondb_owner')`
    );
    console.log('MEMBERS_OF_KEY_ROLES:', JSON.stringify(m, null, 1));
  } catch (e: any) { console.log('E_m:', e.message); }
}

main().finally(() => p.$disconnect());

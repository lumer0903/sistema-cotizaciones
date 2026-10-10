/**
 * Restaura la base de datos desde un backup .sql.gz (requiere Docker en ejecución).
 * Uso:
 *   pnpm db:restore                  → restaura el backup más reciente
 *   pnpm db:restore -- <archivo>     → restaura un archivo específico (dentro de backups/)
 *
 * Nota: termina todas las conexiones a la base destino y la recrea. No correr
 * mientras la API o el worker están usando la base.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
// El .env real del compose (raíz del monorepo) define las credenciales del contenedor.
// Se carga primero; el .env local de packages/database solo aporta valores por defecto.
config({ path: join(__dirname, '..', '..', '.env') });
config({ path: join(__dirname, '..', '.env') });

const DB_NAME = process.env.DATABASE_URL?.match(/\/([^/?]+)(\?|$)/)?.[1] ?? 'goldcontinent';
const DB_USER = process.env.DATABASE_URL?.match(/:\/\/([^:]+):/)?.[1] ?? 'goldcontinent';
const BACKUP_DIR = join(__dirname, '..', 'backups');
const COMPOSE_CWD = join(__dirname, '../..');

function sh(args: string[]): void {
  execFileSync('docker', ['compose', ...args], { cwd: COMPOSE_CWD, stdio: ['ignore', 'inherit', 'inherit'] });
}

function psqlAdmin(sql: string): void {
  // Conectamos a la DB 'postgres' (siempre existe) como superusuario para poder
  // terminar conexiones y dropear/crear la base destino.
  sh(['exec', '-T', 'postgres', 'psql', '-U', DB_USER, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

function latestBackup(): string | null {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql.gz'))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files[0]?.f ?? null;
}

function main(): void {
  const arg = process.argv[2];
  const file = arg ?? latestBackup();

  if (!file) {
    console.error('No hay backups en packages/database/backups/. Ejecuta primero: pnpm db:backup');
    process.exit(1);
  }

  const path = join(BACKUP_DIR, file);
  if (!existsSync(path)) {
    console.error(`No existe el archivo: ${path}`);
    process.exit(1);
  }

  console.log(`Restaurando '${file}' en '${DB_NAME}'...`);
  console.log('(Se cerrarán conexiones activas a la base)');

  // 1. Termina todas las conexiones a la base destino.
  psqlAdmin(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();`
  );

  // 2. Recrea la base limpia. DROP/CREATE no puede correr dentro de una transacción,
  //    por eso usamos --single-transaction=false implícito (psql -c ejecuta cada comando por separado).
  psqlAdmin(`DROP DATABASE IF EXISTS ${DB_NAME};`);
  psqlAdmin(`CREATE DATABASE ${DB_NAME};`);

  // 3. Copia el dump al contenedor y lo aplica (gunzip vive en la imagen Alpine, no en el host).
  sh(['cp', path, `postgres:/tmp/restore.sql.gz`]);
  sh([
    'exec', '-T', 'postgres', 'sh', '-c',
    `gunzip -c /tmp/restore.sql.gz | psql -U ${DB_USER} -d ${DB_NAME} -q && rm /tmp/restore.sql.gz`,
  ]);

  console.log(`Restauración de '${file}' completada.`);
}

try {
  main();
} catch (err) {
  console.error('Error durante la restauración:', (err as Error).message ?? err);
  process.exit(1);
}

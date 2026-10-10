/**
 * Backup de la base de datos usando pg_dump vía Docker (requiere Docker en ejecución).
 * Uso: pnpm db:backup
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
// El .env real del compose (raíz del monorepo) define las credenciales del contenedor.
// Se carga primero; el .env local de packages/database solo aporta valores por defecto.
config({ path: join(__dirname, '..', '..', '.env') });
config({ path: join(__dirname, '..', '.env') });

const DB_NAME = process.env.DATABASE_URL?.match(/\/([^/?]+)(\?|$)/)?.[1] ?? 'goldcontinent';
const DB_USER = process.env.DATABASE_URL?.match(/:\/\/([^:]+):/)?.[1] ?? 'goldcontinent';
const BACKUP_DIR = join(__dirname, '..', 'backups');
const MAX_BACKUPS = 14;
const PROJECT_ROOT = join(__dirname, '..', '..');

function timestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function pruneOld(): void {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql.gz'))
    .map((f) => ({ f, t: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);

  for (const { f } of files.slice(MAX_BACKUPS)) {
    unlinkSync(join(BACKUP_DIR, f));
    console.log(`  Eliminado backup antiguo: ${f}`);
  }
}

function runDump(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      ['compose', 'exec', '-T', 'postgres', 'pg_dump', '-U', DB_USER, '-d', DB_NAME, '--clean', '--if-exists'],
      { cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    const chunks: Buffer[] = [];
    let stderr = '';

    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => {
      stderr += c.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`pg_dump terminó con código ${code}\n${stderr}`));
    });
  });
}

async function main(): Promise<void> {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const out = join(BACKUP_DIR, `backup_${timestamp()}.sql.gz`);

  console.log(`Respaldo de '${DB_NAME}' → ${out}`);
  const dump = await runDump();
  if (dump.length === 0) throw new Error('pg_dump no produjo salida');

  await pipeline(
    (async function* () {
      yield dump;
    })(),
    createGzip(),
    createWriteStream(out)
  );

  console.log(`Listo (${(dump.length / 1024).toFixed(0)} KB sin comprimir). Backups recientes:`);
  readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.sql.gz'))
    .sort()
    .reverse()
    .slice(0, 5)
    .forEach((f) => console.log(`  - ${f}`));

  pruneOld();
}

main().catch((err) => {
  console.error('Error durante el backup:', err.message ?? err);
  process.exit(1);
});

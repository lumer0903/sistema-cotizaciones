#!/usr/bin/env node
/**
 * Orquestador de `pnpm dev`:
 *  1. Arranca la API (@goldcontinent/api) en background.
 *  2. Espera a que responda en API_HEALTH_URL (default http://localhost:3001/api/health).
 *  3. Arranca el web (@goldcontinent/web) solo cuando la API está lista.
 * Evita el error ECONNREFUSED del frontend contra :3001 en el arranque en paralelo.
 */
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const API_URL = process.env.API_HEALTH_URL || 'http://localhost:3001/api/health';
const POLL_MS = 500;
const TIMEOUT_MS = Number(process.env.API_WAIT_TIMEOUT_MS || 300000);

const children = [];
let shuttingDown = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(tag, args) {
  const child = spawn(args, {
    cwd: ROOT,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = `[${tag}] `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const line of lines) out.write(prefix + line + '\n');
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  children.push(child);
  return child;
}

function killTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    /* best effort */
  }
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) killTree(c);
  setTimeout(() => process.exit(code), 200).unref();
}

async function apiIsUp() {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForApi() {
  const start = Date.now();
  let lastLog = 0;
  while (Date.now() - start < TIMEOUT_MS) {
    if (await apiIsUp()) return true;
    const elapsed = Date.now() - start;
    if (elapsed - lastLog >= 5000) {
      lastLog = elapsed;
      console.log(`[dev] ...esperando API (${Math.round(elapsed / 1000)}s / ${TIMEOUT_MS / 1000}s)`);
    }
    await sleep(POLL_MS);
  }
  return false;
}

(async () => {
  console.log('[dev] 1/2 Arrancando API (@goldcontinent/api)...');
  const api = run('api', 'pnpm --filter @goldcontinent/api dev');
  api.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev] La API terminó inesperadamente (code ${code}).`);
      shutdown(code || 1);
    }
  });

  console.log(`[dev] 2/2 Esperando ${API_URL} (timeout ${TIMEOUT_MS / 1000}s)...`);
  const ready = await waitForApi();
  if (!ready) {
    console.error('[dev] La API no respondió a tiempo. Revisa los logs de [api] arriba.');
    shutdown(1);
    return;
  }
  console.log('[dev] API lista. Arrancando web (@goldcontinent/web)...');
  const web = run('web', 'pnpm --filter @goldcontinent/web dev');
  web.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev] El web terminó inesperadamente (code ${code}).`);
      shutdown(code || 1);
    }
  });
})();

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => shutdown(130));
}
process.on('exit', () => {
  for (const c of children) killTree(c);
});

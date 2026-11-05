#!/usr/bin/env node
/**
 * Orquestador de `pnpm dev`:
 *  1. Arranca el ai-service (uvicorn con el venv local, :8000) en paralelo.
 *  2. Arranca la API (@goldcontinent/api) en background.
 *  3. Espera a que responda API_HEALTH_URL (default http://localhost:3001/api/health).
 *  4. Arranca el web (@goldcontinent/web) solo cuando la API está lista.
 * Evita el error ECONNREFUSED del frontend contra :3001 en el arranque en paralelo.
 * La IA es opcional: si no responde, la API sigue con fallback a mock.
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const API_URL = process.env.API_HEALTH_URL || 'http://localhost:3001/api/health';
const AI_URL = process.env.AI_HEALTH_URL || 'http://localhost:8000/health';
const AI_DIR = path.join(ROOT, 'apps', 'ai-service');
const POLL_MS = 500;
const TIMEOUT_MS = Number(process.env.API_WAIT_TIMEOUT_MS || 300000);
const AI_TIMEOUT_MS = Number(process.env.AI_WAIT_TIMEOUT_MS || 60000);

const children = [];
let shuttingDown = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(tag, args, opts = {}) {
  const child = spawn(args, {
    cwd: opts.cwd || ROOT,
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

// Resuelve el Python del ai-service: venv local primero, PATH como fallback.
function resolveAiPython() {
  const venv = process.platform === 'win32'
    ? path.join(AI_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(AI_DIR, '.venv', 'bin', 'python');
  if (fs.existsSync(venv)) return venv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

// Sonda no bloqueante: la IA es opcional (la API tiene fallback a mock),
// así que solo informa y nunca detiene el stack.
async function waitForAi() {
  const start = Date.now();
  while (Date.now() - start < AI_TIMEOUT_MS) {
    try {
      const res = await fetch(AI_URL, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        console.log('[dev] IA lista en :8000');
        return;
      }
    } catch { /* aún arrancando */ }
    await sleep(1000);
  }
  console.warn(
    `[dev] IA no respondió en ${AI_TIMEOUT_MS / 1000}s. Las recomendaciones usarán mock (el resto del stack funciona).`,
  );
}

(async () => {
  console.log('[dev] 1/3 Arrancando ai-service (uvicorn :8000)...');
  const python = resolveAiPython();
  const ai = run('ai', `"${python}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`, {
    cwd: AI_DIR,
  });
  ai.on('exit', (code) => {
    if (!shuttingDown) {
      console.warn(`[dev] ai-service terminó (code ${code}). Las recomendaciones usarán mock.`);
    }
  });
  waitForAi();

  console.log('[dev] 2/3 Arrancando API (@goldcontinent/api)...');
  const api = run('api', 'pnpm --filter @goldcontinent/api dev');
  api.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[dev] La API terminó inesperadamente (code ${code}).`);
      shutdown(code || 1);
    }
  });

  console.log(`[dev] Esperando ${API_URL} (timeout ${TIMEOUT_MS / 1000}s)...`);
  const ready = await waitForApi();
  if (!ready) {
    console.error('[dev] La API no respondió a tiempo. Revisa los logs de [api] arriba.');
    shutdown(1);
    return;
  }
  console.log('[dev] API lista. 3/3 Arrancando web (@goldcontinent/web)...');
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

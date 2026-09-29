#!/usr/bin/env node
/**
 * Arranca solo el ai-service en local:
 *   pnpm dev:ai
 * Usa el venv de apps/ai-service si existe; si no, el Python del PATH.
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const AI_DIR = path.join(ROOT, 'apps', 'ai-service');

function resolvePython() {
  const venv = process.platform === 'win32'
    ? path.join(AI_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(AI_DIR, '.venv', 'bin', 'python');
  if (fs.existsSync(venv)) return venv;
  return process.platform === 'win32' ? 'python' : 'python3';
}

const python = resolvePython();
console.log(`[dev:ai] ${python} -m uvicorn app.main:app --reload :8000`);

const child = spawn(
  `"${python}" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`,
  { cwd: AI_DIR, shell: true, stdio: 'inherit' },
);

child.on('exit', (code) => process.exit(code ?? 0));

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
    process.exit(130);
  });
}

import * as path from 'path';
import { config as loadDotenv } from 'dotenv';

// Carga el .env del monorepo ANTES de que cualquier import lea process.env.
// jwt.ts ya no tiene fallback de secreto (auditoría C-01/P13): sin este
// archivo, el API en dev fallaría al firmar tokens.
// Candidatos según cwd (scripts pnpm se ejecutan con cwd = apps/api):
//   1) apps/api/.env o .env de la raíz (si se arranca desde la raíz)
//   2) ../../.env = raíz del monorepo cuando cwd = apps/api
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const file of candidates) {
  // dotenv no pisa variables ya existentes (producción usa env reales).
  loadDotenv({ path: file });
}

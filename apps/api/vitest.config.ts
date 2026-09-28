import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Carga el .env de la raíz (JWT_SECRET) antes de los tests: jwt.ts no
    // tiene fallback de secreto por seguridad.
    setupFiles: ['src/load-env.ts'],
    passWithNoTests: true,
  },
});

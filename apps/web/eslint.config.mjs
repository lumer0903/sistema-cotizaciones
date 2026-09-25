import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'node_modules/**'] },
  ...(Array.isArray(nextVitals) ? nextVitals : nextVitals?.default ?? []),
  ...(Array.isArray(nextTs) ? nextTs : nextTs?.default ?? []),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // sensible a falsos positivos en callbacks con refs; se mantiene en warn.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Reglas de react-hooks v6 / React Compiler: el refactor de efectos ya se
      // completó (patrones render-adjust / async wrappers), se exigen como error.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      // Limitación de react-hook-form con React Compiler: la compilación se omite
      // para esos módulos ("Compilation Skipped"); no es accionable desde el código.
      'react-hooks/incompatible-library': 'off',
    },
  },
];

export default config;

import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts', 'node_modules/**'] },
  ...(Array.isArray(nextVitals) ? nextVitals : nextVitals?.default ?? []),
  ...(Array.isArray(nextTs) ? nextTs : nextTs?.default ?? []),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Reglas nuevas de react-hooks v6 / React Compiler: el código usa el patrón
      // clásico (setState en effects) de forma pervasiva; degradadas a warn para
      // no bloquear el lint. Subir a error exigiría un refactor global.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
];

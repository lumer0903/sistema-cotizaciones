import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// RTL auto-cleanup necesita los globals de vitest; con imports explícitos se
// limpia manualmente después de cada test.
afterEach(() => cleanup());

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPdfRole } from './pdf.constants';

describe('getPdfRole (PDF_ROLE)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('default a both si no está definido', () => {
    vi.stubEnv('PDF_ROLE', '');
    expect(getPdfRole()).toBe('both');
  });

  it.each(['producer', 'consumer', 'both'])('acepta %s', (rol) => {
    vi.stubEnv('PDF_ROLE', rol);
    expect(getPdfRole()).toBe(rol);
  });

  it('normaliza mayúsculas y espacios', () => {
    vi.stubEnv('PDF_ROLE', '  Consumer ');
    expect(getPdfRole()).toBe('consumer');
  });

  it('valor inválido cae a both (no rompe el arranque)', () => {
    vi.stubEnv('PDF_ROLE', 'worker-maestro');
    expect(getPdfRole()).toBe('both');
  });
});

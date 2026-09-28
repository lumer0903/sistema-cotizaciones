import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Auditoría P13: jwt.ts ya no tiene secreto por defecto. Estos tests
// verifican que falte el env o no, sin dejar pasar el fallback histórico.
describe('jwt secrets (P13: sin fallback)', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalRefresh = process.env.JWT_REFRESH_SECRET;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalRefresh === undefined) delete process.env.JWT_REFRESH_SECRET;
    else process.env.JWT_REFRESH_SECRET = originalRefresh;
    vi.resetModules();
  });

  it('ACCESS_TOKEN_SECRET lanza si falta JWT_SECRET', async () => {
    delete process.env.JWT_SECRET;
    const mod = await import('@goldcontinent/shared/auth/jwt');
    expect(() => mod.JWT_CONFIG.ACCESS_TOKEN_SECRET).toThrow(/JWT_SECRET/);
  });

  it('ACCESS_TOKEN_SECRET usa el secreto definido (nunca el valor dev)', async () => {
    process.env.JWT_SECRET = 'secreto-unitario-de-prueba';
    const mod = await import('@goldcontinent/shared/auth/jwt');
    expect(mod.JWT_CONFIG.ACCESS_TOKEN_SECRET).toBe('secreto-unitario-de-prueba');
    expect(mod.JWT_CONFIG.ACCESS_TOKEN_SECRET).not.toBe('dev-secret-change-in-production');
  });

  it('REFRESH_TOKEN_SECRET lanza si falta JWT_REFRESH_SECRET', async () => {
    delete process.env.JWT_REFRESH_SECRET;
    const mod = await import('@goldcontinent/shared/auth/jwt');
    expect(() => mod.JWT_CONFIG.REFRESH_TOKEN_SECRET).toThrow(/JWT_REFRESH_SECRET/);
  });

  it('REFRESH_TOKEN_SECRET usa el secreto definido', async () => {
    process.env.JWT_REFRESH_SECRET = 'refresh-unitario-de-prueba';
    const mod = await import('@goldcontinent/shared/auth/jwt');
    expect(mod.JWT_CONFIG.REFRESH_TOKEN_SECRET).toBe('refresh-unitario-de-prueba');
    expect(mod.JWT_CONFIG.REFRESH_TOKEN_SECRET).not.toBe('dev-secret-change-in-production');
  });

  it('los expiraciones siguen siendo 15m / 7d', async () => {
    const mod = await import('@goldcontinent/shared/auth/jwt');
    expect(mod.JWT_CONFIG.ACCESS_TOKEN_EXPIRY).toBe('15m');
    expect(mod.JWT_CONFIG.REFRESH_TOKEN_EXPIRY).toBe('7d');
  });
});

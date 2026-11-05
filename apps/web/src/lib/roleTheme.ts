/** Paleta de sesión: los roles personalizados conservan el tema operativo. */
export function roleTheme(rol?: string | null): 'admin' | 'vendedor' {
  const normalized = rol?.trim().toLowerCase();
  return !normalized || ['admin', 'gerente'].includes(normalized) ? 'admin' : 'vendedor';
}

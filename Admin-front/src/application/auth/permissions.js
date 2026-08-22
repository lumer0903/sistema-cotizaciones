export const DEFAULT_ROLE_PERMISSIONS = {
  admin: { dashboard: 'edicion', productos: 'edicion', importacion: 'edicion', consulta_precios: 'edicion', cotizaciones: 'lectura', usuarios: 'edicion' }
};

const LEVELS = { sin_acceso: 0, lectura: 1, edicion: 2 };
const PERMISSIONS_KEY = 'goldcontinent_role_permissions';

export function permissionsFor(role) {
  try {
    const custom = JSON.parse(localStorage.getItem(PERMISSIONS_KEY)) || {};
    return { ...(DEFAULT_ROLE_PERMISSIONS[role] || {}), ...(custom[role] || {}) };
  } catch {
    localStorage.removeItem(PERMISSIONS_KEY);
    return { ...(DEFAULT_ROLE_PERMISSIONS[role] || {}) };
  }
}

export function can(user, module, required = 'lectura') {
  const current = permissionsFor(user?.rol)[module] || 'sin_acceso';
  return (LEVELS[current] || 0) >= (LEVELS[required] || 1);
}
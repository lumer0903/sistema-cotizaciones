import { Rol, PermisoModulo, NivelPermiso } from '../constants/enums';

export const DEFAULT_ROLE_PERMISSIONS: Record<Rol, Record<PermisoModulo, NivelPermiso>> = {
  admin: {
    dashboard: 'edicion',
    productos: 'edicion',
    importacion: 'edicion',
    consulta_precios: 'edicion',
    cotizaciones: 'edicion',
    recomendaciones: 'edicion',
    pdf: 'edicion',
    usuarios: 'edicion',
    cobranza: 'edicion',
    ventas: 'edicion',
    reportes: 'edicion',
    configuracion: 'edicion',
  },
  gerente: {
    dashboard: 'edicion',
    productos: 'edicion',
    importacion: 'edicion',
    consulta_precios: 'edicion',
    cotizaciones: 'edicion',
    recomendaciones: 'edicion',
    pdf: 'edicion',
    usuarios: 'edicion',
    cobranza: 'edicion',
    ventas: 'edicion',
    reportes: 'edicion',
    configuracion: 'lectura',
  },
  vendedor: {
    dashboard: 'lectura',
    productos: 'lectura',
    importacion: 'sin_acceso',
    consulta_precios: 'lectura',
    cotizaciones: 'edicion',
    recomendaciones: 'edicion',
    pdf: 'edicion',
    usuarios: 'sin_acceso',
    cobranza: 'sin_acceso',
    ventas: 'edicion',
    reportes: 'lectura',
    configuracion: 'sin_acceso',
  },
};

const LEVELS: Record<NivelPermiso, number> = {
  sin_acceso: 0,
  lectura: 1,
  edicion: 2,
};

export type MapaPermisos = Record<PermisoModulo, NivelPermiso>;
export type OverridesPermisos = Partial<MapaPermisos>;

export type GrupoModulo = 'administrativo' | 'operativo';

export const GRUPOS_MODULOS: Record<GrupoModulo, readonly PermisoModulo[]> = {
  administrativo: ['dashboard', 'usuarios', 'reportes', 'configuracion', 'cobranza', 'importacion'],
  operativo: ['productos', 'consulta_precios', 'cotizaciones', 'recomendaciones', 'pdf', 'ventas'],
} as const;

export const GRUPO_LABELS: Record<GrupoModulo, string> = {
  administrativo: 'Sistema administrativo',
  operativo: 'Sistema operativo',
};

export function permisosPorRol(rol: string): MapaPermisos {
  const defaults = DEFAULT_ROLE_PERMISSIONS[rol as Rol];
  return defaults || DEFAULT_ROLE_PERMISSIONS.vendedor;
}

/** Matriz completa en edición forzada (rol admin / superadmin). */
export function esMatrizBloqueada(codigo: string): boolean {
  return codigo === 'admin' || codigo === 'superadmin';
}

export function matrizSiempreEdicion(): MapaPermisos {
  const mapa = {} as MapaPermisos;
  for (const modulo of Object.values(PermisoModulo)) {
    mapa[modulo] = 'edicion';
  }
  return mapa;
}

/** Efectivos = defaults del rol + overrides personalizados del usuario. */
export function permisosEfectivos(rol: string, overrides?: OverridesPermisos | null): MapaPermisos {
  const base = { ...permisosPorRol(rol) };
  if (!overrides) return base;
  for (const modulo of Object.values(PermisoModulo)) {
    const nivel = overrides[modulo];
    if (nivel) base[modulo] = nivel;
  }
  return base;
}

export function tieneOverrides(overrides?: OverridesPermisos | null): boolean {
  if (!overrides) return false;
  return Object.values(PermisoModulo).some((m) => overrides[m] != null);
}

/** Overrides que difieren de los defaults del rol (para persistir solo lo personalizado). */
export function overridesDiferentes(rol: string, efectivos: MapaPermisos): OverridesPermisos {
  const defaults = permisosPorRol(rol);
  const overrides: OverridesPermisos = {};
  for (const modulo of Object.values(PermisoModulo)) {
    if (efectivos[modulo] !== defaults[modulo]) {
      overrides[modulo] = efectivos[modulo];
    }
  }
  return overrides;
}

export function puede(
  usuario: { rol: string; permisos?: OverridesPermisos | null } | null,
  modulo: PermisoModulo,
  requerido: NivelPermiso = 'lectura',
): boolean {
  if (!usuario) return false;
  const overrides = usuario.permisos?.[modulo];
  const actual = overrides ?? permisosPorRol(usuario.rol)[modulo] ?? 'sin_acceso';
  return (LEVELS[actual] || 0) >= (LEVELS[requerido] || 1);
}

export function soloRoles(...rolesPermitidos: string[]) {
  return (usuario: { rol: string } | null): boolean => {
    if (!usuario) return false;
    return rolesPermitidos.includes(usuario.rol);
  };
}

export const soloAdmin = soloRoles(Rol.admin);
export const soloAdminGerente = soloRoles(Rol.admin, Rol.gerente);
export const soloVendedor = soloRoles(Rol.vendedor);

export interface UsuarioAutenticado {
  id_usuario: number;
  email: string;
  rol: string;
  nombre: string;
  avatar_url?: string | null;
  permisos?: OverridesPermisos | null;
}
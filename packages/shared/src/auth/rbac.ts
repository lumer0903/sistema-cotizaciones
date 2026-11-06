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
    cobranza: 'lectura',
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

/**
 * CATÁLOGO ÚNICO DE MÓDULOS (fuente de verdad).
 *
 * Para añadir un módulo al sistema:
 *  1. Agregar la clave al enum `PermisoModulo` (enums.ts) y a la columna en Prisma.
 *  2. Agregar UNA entrada aquí (label, grupo y ruta si es navegable).
 *  3. En el frontend, asignar el ítem de menú correspondiente a `modulo`.
 *
 * A partir de ahí la matriz de permisos, los labels, los grupos y el sidebar
 * se actualizan automáticamente (no hay que tocar nada más).
 */
export interface ModuloCatalogo {
  key: PermisoModulo;
  /** Nombre visible en la matriz de permisos y en el menú. */
  label: string;
  grupo: GrupoModulo;
  /** Ruta principal si el módulo es navegable desde el menú lateral. */
  ruta?: string;
}

export const MODULOS_CATALOGO: readonly ModuloCatalogo[] = [
  { key: 'dashboard', label: 'Dashboard', grupo: 'administrativo', ruta: '/dashboard' },
  { key: 'usuarios', label: 'Usuarios', grupo: 'administrativo', ruta: '/usuarios' },
  { key: 'reportes', label: 'Reportes', grupo: 'administrativo', ruta: '/reportes' },
  { key: 'configuracion', label: 'Configuración', grupo: 'administrativo', ruta: '/configuracion' },
  { key: 'cobranza', label: 'Cobranza', grupo: 'administrativo', ruta: '/cobranza' },
  { key: 'importacion', label: 'Importación', grupo: 'administrativo' },
  { key: 'productos', label: 'Productos', grupo: 'operativo', ruta: '/inventario' },
  { key: 'consulta_precios', label: 'Precios e Historial', grupo: 'operativo', ruta: '/precios' },
  { key: 'cotizaciones', label: 'Cotizaciones', grupo: 'operativo', ruta: '/cotizaciones' },
  { key: 'recomendaciones', label: 'Recomendaciones', grupo: 'operativo' },
  { key: 'pdf', label: 'Generación PDF', grupo: 'operativo' },
  { key: 'ventas', label: 'Ventas', grupo: 'operativo' },
] as const;

/** Labels por clave, derivados del catálogo. */
export const MODULO_LABELS: Record<PermisoModulo, string> = Object.fromEntries(
  MODULOS_CATALOGO.map((m) => [m.key, m.label]),
) as Record<PermisoModulo, string>;

/** Rutas por clave, derivadas del catálogo (para el sidebar). */
export const MODULOS_RUTA: Partial<Record<PermisoModulo, string>> = Object.fromEntries(
  MODULOS_CATALOGO.filter((m) => m.ruta).map((m) => [m.key, m.ruta]),
);

export const GRUPOS_MODULOS: Record<GrupoModulo, readonly PermisoModulo[]> = {
  administrativo: MODULOS_CATALOGO.filter((m) => m.grupo === 'administrativo').map((m) => m.key),
  operativo: MODULOS_CATALOGO.filter((m) => m.grupo === 'operativo').map((m) => m.key),
} as Record<GrupoModulo, readonly PermisoModulo[]>;

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
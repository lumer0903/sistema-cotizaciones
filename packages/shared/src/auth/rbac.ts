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

export function permisosPorRol(rol: Rol): Record<PermisoModulo, NivelPermiso> {
  return DEFAULT_ROLE_PERMISSIONS[rol] || DEFAULT_ROLE_PERMISSIONS.vendedor;
}

export function puede(usuario: { rol: Rol } | null, modulo: PermisoModulo, requerido: NivelPermiso = 'lectura'): boolean {
  if (!usuario) return false;
  const permisos = permisosPorRol(usuario.rol);
  const actual = permisos[modulo] || 'sin_acceso';
  return (LEVELS[actual] || 0) >= (LEVELS[requerido] || 1);
}

export function soloRoles(...rolesPermitidos: Rol[]) {
  return (usuario: { rol: Rol } | null): boolean => {
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
  rol: Rol;
  nombre: string;
}
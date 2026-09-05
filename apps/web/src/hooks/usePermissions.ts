import { useAuth } from '@/lib/authProvider';
import { puede, PermisoModulo, NivelPermiso } from '@goldcontinent/shared/auth';

export function usePermissions() {
  const { usuario } = useAuth();

  const can = (modulo: PermisoModulo, requerido: NivelPermiso = 'lectura') => {
    return puede(usuario, modulo, requerido);
  };

  const isAdmin = usuario?.rol === 'admin';
  const isGerente = usuario?.rol === 'gerente';
  const isVendedor = usuario?.rol === 'vendedor';

  return { can, isAdmin, isGerente, isVendedor, usuario };
}
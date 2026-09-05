'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/authProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { PermisoModulo, NivelPermiso, Rol } from '@goldcontinent/shared/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: PermisoModulo;
  required?: NivelPermiso;
  roles?: Rol[];
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  permission,
  required = 'lectura',
  roles,
  fallback = null,
}: ProtectedRouteProps) {
  const { usuario, loading } = useAuth();
  const { can } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!usuario) {
        router.push('/login');
        return;
      }

      if (roles?.length && !roles.includes(usuario.rol)) {
        router.push('/dashboard');
        return;
      }

      if (permission && !can(permission, required)) {
        router.push('/dashboard');
        return;
      }
    }
  }, [usuario, loading, permission, required, roles, can, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!usuario || (roles?.length && !roles.includes(usuario.rol)) || (permission && !can(permission, required))) {
    return fallback;
  }

  return <>{children}</>;
}
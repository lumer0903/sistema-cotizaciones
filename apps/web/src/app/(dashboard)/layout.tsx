'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MODULOS_CATALOGO } from '@goldcontinent/shared/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/lib/authProvider';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { VendedorLayout } from '@/components/layouts/VendedorLayout';

/**
 * Layout dinámico por rol para todas las rutas de (dashboard).
 *
 * REGLA DE DOS TEMAS:
 *  - admin / gerente  → <AdminLayout />  (paleta ámbar / dorada)
 *  - cualquier otro rol → <VendedorLayout /> (paleta roja, fallback por defecto)
 *
 * Ambos layouts cargan internamente el Header (con Breadcrumbs) y el Sidebar,
 * por lo que ninguna página hija debe renderizarlos de forma manual.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { can } = usePermissions();

  useEffect(() => {
    if (!loading && !usuario) {
      router.push('/login');
    }
  }, [loading, usuario, router]);

  if (loading || !usuario) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-screen flex flex-col items-center justify-center gap-3"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
        <span className="sr-only">Cargando panel…</span>
      </div>
    );
  }

  // REGLA DE TEMAS: admin / gerente → paleta ámbar (AdminLayout).
  // VENDEDOR (o cualquier otro rol) → obligatoriamente paleta roja (VendedorLayout).
  const rol = (usuario.rol ?? '').trim().toLowerCase();
  const esAdmin = rol === 'admin' || rol === 'gerente';

  const modulo = MODULOS_CATALOGO.find(({ ruta }) =>
    ruta && (pathname === ruta || pathname.startsWith(ruta + '/'))
  );
  const edicion = /^\/cotizaciones\/(crear|editar)(\/|$)/.test(pathname);
  const acceso = (!modulo || can(modulo.key, edicion ? 'edicion' : 'lectura'))
    && (!pathname.startsWith('/cotizaciones/pdf/') || can('pdf', 'lectura'));
  const contenido = acceso ? children : (
    <div role="alert" className="rounded-xl border border-border-default bg-white p-6 text-zinc-900">
      <h1 className="text-lg font-semibold">Acceso restringido</h1>
      <p className="mt-2 text-sm text-zinc-600">Tu rol no tiene permiso para acceder a esta página.</p>
    </div>
  );

  return esAdmin ? <AdminLayout>{contenido}</AdminLayout> : <VendedorLayout>{contenido}</VendedorLayout>;
}

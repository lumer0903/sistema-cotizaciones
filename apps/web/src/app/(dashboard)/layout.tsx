'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        <span className="sr-only">Cargando panel…</span>
      </div>
    );
  }

  // REGLA DE TEMAS: admin / gerente → paleta ámbar (AdminLayout).
  // VENDEDOR (o cualquier otro rol) → obligatoriamente paleta roja (VendedorLayout).
  const rol = (usuario.rol ?? '').trim().toLowerCase();
  const esAdmin = rol === 'admin' || rol === 'gerente';

  return esAdmin ? <AdminLayout>{children}</AdminLayout> : <VendedorLayout>{children}</VendedorLayout>;
}

'use client';

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard de área por rol: los permisos por módulo se filtran en la nav
  // y un permission fijo (p. ej. "dashboard") bloquearía al área completo
  // ante overrides que solo afectan a otro módulo.
  return (
    <ProtectedRoute roles={['admin', 'gerente']} fallback={null}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
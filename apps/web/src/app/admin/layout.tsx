'use client';

import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { PermisoModulo } from '@goldcontinent/shared/auth';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission="dashboard" roles={['admin', 'gerente']} fallback={null}>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
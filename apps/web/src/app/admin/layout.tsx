'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermisoModulo } from '@goldcontinent/shared/auth';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission="dashboard" roles={['admin', 'gerente']} fallback={null}>
      <AdminLayout title="Dashboard">{children}</AdminLayout>
    </ProtectedRoute>
  );
}
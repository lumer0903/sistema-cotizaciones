'use client';

import { VendedorLayout } from '@/components/VendedorLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermisoModulo } from '@goldcontinent/shared/auth';

export default function VendedorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission="ventas" roles={['vendedor']} fallback={null}>
      <VendedorLayout title="Punto de Venta">{children}</VendedorLayout>
    </ProtectedRoute>
  );
}
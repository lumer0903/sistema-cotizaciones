'use client';

import { VendedorLayout } from '@/components/layouts/VendedorLayout';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

export default function VendedorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute permission="cotizaciones" roles={['vendedor']} fallback={null}>
      <VendedorLayout>{children}</VendedorLayout>
    </ProtectedRoute>
  );
}
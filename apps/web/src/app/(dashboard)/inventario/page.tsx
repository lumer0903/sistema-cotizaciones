'use client';

import { Suspense } from 'react';
import { InventarioView } from '@/features/inventario';

export default function InventarioPage() {
  return (
    <Suspense fallback={<div>Cargando inventario...</div>}>
      <InventarioView />
    </Suspense>
  );
}

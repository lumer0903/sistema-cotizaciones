'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductosCrearRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inventario');
  }, [router]);

  return null;
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductosRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/inventario');
  }, [router]);

  return null;
}
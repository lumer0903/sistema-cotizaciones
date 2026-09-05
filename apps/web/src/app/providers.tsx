'use client';

import { AuthProvider } from '@/lib/authProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
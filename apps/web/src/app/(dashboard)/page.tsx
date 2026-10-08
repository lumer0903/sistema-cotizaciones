import { redirect } from 'next/navigation';

/**
 * Índice del route group (dashboard).
 * `app/page.tsx` ya renderiza el Dashboard en `/`, así que este índice
 * redirige para evitar dos páginas paralelas con la misma ruta.
 */
export default function DashboardIndexPage() {
  redirect('/dashboard');
}

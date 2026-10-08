'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { useAuth } from '@/lib/authProvider';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Avatar } from '@/components/ui/Avatar';
import { PerfilModal } from '@/features/usuarios/components/PerfilModal';
import { Sidebar } from '@/components/ui/Sidebar';

export function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHydrated, setSidebarHydrated] = useState(false);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  const { usuario } = useAuth();

  // Hidratación desde localStorage: respeta la preferencia guardada
  // (fallback: abierto en desktop, cerrado en móvil). Estado inicial `false`
  // para evitar mismatch de hidratación SSR/cliente.
  useEffect(() => {
    const stored = localStorage.getItem('sidebarOpen');
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
    } else if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
    setSidebarHydrated(true);
  }, []);

  // Persiste el estado del sidebar para recordarlo entre sesiones
  useEffect(() => {
    if (!sidebarHydrated) return;
    localStorage.setItem('sidebarOpen', String(sidebarOpen));
  }, [sidebarOpen, sidebarHydrated]);

  // Bloquea el scroll del body sólo cuando el menú es drawer (móvil < lg).
  // En desktop el sidebar vive en flujo y la página scrollea con normalidad.
  useEffect(() => {
    if (!sidebarOpen || window.innerWidth >= 1024) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [sidebarOpen]);

  // Escape cierra el drawer (accesibilidad)
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-900" data-role={usuario?.rol}>
      {/* Skip link: primer elemento enfocable para navegación por teclado */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-vendedor-primary focus:text-sm focus:font-bold focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-modal focus:border focus:border-border-default"
      >
        Saltar al contenido
      </a>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex flex-col flex-1 min-w-0 transition-[padding] duration-300 ease-in-out ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-md text-zinc-500 hover:text-vendedor-primary hover:bg-vendedor-soft shrink-0"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Alternar menú"
              aria-expanded={sidebarOpen}
              aria-controls="menu-lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs accent="vendedor" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-zinc-900">{usuario?.nombre || 'Vendedor'}</span>
              <span className="text-xs font-semibold tracking-wider text-vendedor-primary uppercase">
                {usuario?.rol ? 'Vendedor' : 'Vendedor'}
              </span>
            </div>
            <Avatar
              src={usuario?.avatar_url}
              nombre={usuario?.nombre || 'VE'}
              size="sm"
              onClick={() => setIsPerfilOpen(true)}
              title="Mi perfil"
              className="bg-vendedor-primary text-vendedor-on border-transparent"
            />
          </div>
        </header>

        <main id="contenido-principal" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      <PerfilModal open={isPerfilOpen} onClose={() => setIsPerfilOpen(false)} />
    </div>
  );
}
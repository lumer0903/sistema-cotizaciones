'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useSidebarOpen } from '@/hooks/useSidebarOpen';
import { useAuth } from '@/lib/authProvider';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { Avatar } from '@/components/ui/Avatar';
import { PerfilModal } from '@/features/usuarios/components/PerfilModal';
import { Sidebar } from '@/components/ui/Sidebar';

export function VendedorLayout({ children }: { children: React.ReactNode }) {
  // Preferencia persistida del sidebar (localStorage) fuera de los efectos
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  const { usuario } = useAuth();

  return (
    <div className="min-h-screen flex bg-surface-muted text-brand-subtitle" data-theme="vendedor">
      {/* Skip link: primer elemento enfocable para navegación por teclado */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-surface focus:text-vendedor-primary focus:text-sm focus:font-bold focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-modal focus:border focus:border-border-default"
      >
        Saltar al contenido
      </a>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out ${sidebarOpen ? 'lg:pl-60' : 'lg:pl-0'}`}>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border-default bg-surface/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              className="p-2 min-h-9 min-w-9 flex items-center justify-center rounded-lg text-brand-options hover:text-vendedor-primary hover:bg-vendedor-soft shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Alternar menú"
              aria-expanded={sidebarOpen}
              aria-controls="menu-lateral"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <Breadcrumbs accent="vendedor" />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-brand-subtitle">{usuario?.nombre || 'Vendedor'}</span>
              <span className="text-[10px] font-semibold tracking-wider text-vendedor-primary uppercase">
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

        <main id="contenido-principal" className="flex-1 p-4 lg:p-5 max-w-[1600px] w-full mx-auto space-y-4">
          {children}
        </main>
      </div>

      <PerfilModal open={isPerfilOpen} onClose={() => setIsPerfilOpen(false)} />
    </div>
  );
}

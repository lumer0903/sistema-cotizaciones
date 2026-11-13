'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Settings, Bell, Menu } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { NotificacionesDrawer } from '@/components/ui/NotificacionesDrawer';
import { PerfilModal } from '@/features/usuarios/components/PerfilModal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/authProvider';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';
import { useSidebarOpen } from '@/hooks/useSidebarOpen';
import Link from 'next/link';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);
  const [alertasCount, setAlertasCount] = useState(0);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  // Preferencia persistida del sidebar en escritorio (expandido = true, colapsado = false)
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  // Estado del drawer para móviles (< 1024px)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchAlertasCount = useCallback(() => {
    return apiClient('/notificaciones')
      .then((res) => (res.data || []).filter((n: { leida?: boolean }) => !n.leida).length)
      .catch((e) => {
        console.error('Error cargando contador de notificaciones:', e);
        return 0;
      });
  }, []);

  useEffect(() => {
    fetchAlertasCount().then((count) => setAlertasCount(count));
    const interval = setInterval(() => {
      fetchAlertasCount().then((count) => setAlertasCount(count));
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchAlertasCount]);

  return (
    <div className="min-h-screen bg-surface-muted/50 flex font-sans" data-theme="admin">
      {/* Skip link: primer elemento enfocable para navegación por teclado */}
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-surface focus:text-accent-ink focus:text-sm focus:font-bold focus:px-4 focus:py-2.5 focus:rounded-xl focus:shadow-modal focus:border focus:border-border-default"
      >
        Saltar al contenido
      </a>
      {/* BACKDROP MÓVIL */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <Sidebar
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        collapsed={!sidebarOpen}
        onToggleCollapse={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* ÁREA PRINCIPAL */}
      <div className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-200 ease-in-out ${sidebarOpen ? 'lg:pl-60' : 'lg:pl-16'}`}>
        {/* NAVBAR DINÁMICO */}
        <header className="w-full h-14 px-4 sm:px-5 lg:px-6 bg-surface border-b border-border-default flex items-center justify-between gap-3 sticky top-0 z-30">

          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* BOTÓN MENÚ MÓVIL Y ESCRITORIO */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileDrawerOpen(!mobileDrawerOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-2 min-h-9 min-w-9 flex items-center justify-center rounded-lg text-brand-subtitle hover:text-accent-ink hover:bg-surface-muted transition-colors shrink-0 cursor-pointer"
              aria-label="Alternar menú"
              aria-expanded={sidebarOpen}
              aria-controls="menu-lateral"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            {/* BREADCRUMB / MIGA DE PAN */}
            <Breadcrumbs />
          </div>

          {/* ICONOS / AVATAR */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAlertasOpen(true)}
              className="relative min-h-9 min-w-9 flex items-center justify-center text-brand-subtitle hover:text-accent-ink hover:bg-surface-muted rounded-lg transition-colors"
              title="Notificaciones"
              aria-label={`Notificaciones${alertasCount > 0 ? ` (${alertasCount} sin leer)` : ''}`}
            >
              <Bell className="w-4.5 h-4.5 stroke-[2]" />
              {alertasCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center">
                  {alertasCount > 9 ? '9+' : alertasCount}
                </span>
              )}
            </button>

            <Link
              href="/configuracion"
              className="min-h-9 min-w-9 flex items-center justify-center text-brand-subtitle hover:text-accent-ink hover:bg-surface-muted rounded-lg transition-colors"
              title="Configuración"
              aria-label="Configuración"
            >
              <Settings className="w-4.5 h-4.5 stroke-[2]" />
            </Link>
            <Avatar
              src={usuario?.avatar_url}
              nombre={usuario?.nombre}
              size="sm"
              onClick={() => setIsPerfilOpen(true)}
              title="Mi perfil"
            />
          </div>
        </header>

        {/* CONTENIDO INTERNO */}
        <main id="contenido-principal" className="flex-1 w-full max-w-[1600px] mx-auto p-4 lg:p-5 space-y-4">
          {children}
        </main>
      </div>

      <NotificacionesDrawer
        open={isAlertasOpen}
        onClose={() => setIsAlertasOpen(false)}
        onSuccess={() => fetchAlertasCount().then((count) => setAlertasCount(count))}
      />

      <PerfilModal open={isPerfilOpen} onClose={() => setIsPerfilOpen(false)} />
    </div>
  );
}

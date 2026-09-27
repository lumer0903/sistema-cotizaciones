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
import Link from 'next/link';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);
  const [alertasCount, setAlertasCount] = useState(0);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchAlertasCount = useCallback(() => {
    return apiClient('/inventario/alertas?estado=activa')
      .then((res) => (res.data || []).length)
      .catch((e) => {
        console.error('Error cargando contador de alertas:', e);
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

  // Bloquea el scroll del body mientras el menú móvil está abierto
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  // Escape cierra el drawer del menú móvil
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-neutral-50/50 flex font-['DM_Sans']">
      {/* BACKDROP MÓVIL */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col min-h-screen">
        {/* NAVBAR DINÁMICO */}
        <header className="w-full h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 flex items-center justify-between gap-3 sticky top-0 z-30">

          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* BOTÓN MENÚ MÓVIL */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-md text-neutral-600 hover:text-black hover:bg-gray-100 transition-colors lg:hidden shrink-0"
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
              aria-controls="menu-lateral"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* BREADCRUMB / MIGA DE PAN */}
            <Breadcrumbs />
          </div>

          {/* ICONOS / AVATAR */}
          <div className="flex items-center gap-3">
            <Avatar
              src={usuario?.avatar_url}
              nombre={usuario?.nombre}
              size="md"
              onClick={() => setIsPerfilOpen(true)}
              title="Mi perfil"
            />

            <button
              type="button"
              onClick={() => setIsAlertasOpen(true)}
              className="relative min-h-11 min-w-11 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
              aria-label={`Notificaciones${alertasCount > 0 ? ` (${alertasCount} sin leer)` : ''}`}
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {alertasCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                  {alertasCount > 9 ? '9+' : alertasCount}
                </span>
              )}
            </button>

            <Link
              href="/admin/configuracion"
              className="min-h-11 min-w-11 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Configuración"
              aria-label="Configuración"
            >
              <Settings className="w-5 h-5 stroke-[2]" />
            </Link>
          </div>
        </header>

        {/* CONTENIDO INTERNO */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
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
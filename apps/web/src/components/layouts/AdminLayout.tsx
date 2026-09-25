'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/ui/Sidebar';
import { Settings, Bell } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { NotificacionesDrawer } from '@/components/ui/NotificacionesDrawer';
import { PerfilModal } from '@/features/usuarios/components/PerfilModal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/authProvider';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);
  const [alertasCount, setAlertasCount] = useState(0);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);

  const fetchAlertasCount = useCallback(async () => {
    try {
      const res = await apiClient('/inventario/alertas?estado=activa');
      const alertas = res.data || [];
      setAlertasCount(alertas.length);
    } catch (e) {
      console.error('Error cargando contador de alertas:', e);
      setAlertasCount(0);
    }
  }, []);

  useEffect(() => {
    fetchAlertasCount();
    const interval = setInterval(fetchAlertasCount, 60000);
    return () => clearInterval(interval);
  }, [fetchAlertasCount]);

  return (
    <div className="min-h-screen bg-neutral-50/50 flex font-['DM_Sans']">
      {/* SIDEBAR */}
      <Sidebar />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* NAVBAR DINÁMICO */}
        <header className="w-full h-16 px-8 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30">

          {/* BREADCRUMB / MIGA DE PAN */}
          <Breadcrumbs />

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
              className="relative w-8 h-8 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {alertasCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {alertasCount > 9 ? '9+' : alertasCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Configuración"
            >
              <Settings className="w-5 h-5 stroke-[2]" />
            </button>
          </div>
        </header>

        {/* CONTENIDO INTERNO */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      <NotificacionesDrawer
        open={isAlertasOpen}
        onClose={() => setIsAlertasOpen(false)}
        onSuccess={() => fetchAlertasCount()}
      />

      <PerfilModal open={isPerfilOpen} onClose={() => setIsPerfilOpen(false)} />
    </div>
  );
}
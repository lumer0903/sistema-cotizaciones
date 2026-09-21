'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { Settings, Bell } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { AlertasStockTable } from '@/features/inventario/components/AlertasStockTable';

const ROUTE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'DASHBOARD',
  '/admin/inventario': 'INVENTARIO',
  '/admin/precios': 'PRECIO & HISTORIAL',
  '/admin/cotizaciones': 'COTIZACIONES',
  '/admin/cotizaciones/crear': 'CREAR COTIZACIÓN',
  '/admin/ventas': 'VENTAS',
  '/admin/ventas/nueva': 'NUEVA VENTA',
  '/admin/cobranza': 'COBRANZA',
  '/admin/reportes': 'REPORTES',
  '/admin/usuarios': 'USUARIOS',
  '/admin/configuracion': 'CONFIGURACIÓN',
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAlertasOpen, setIsAlertasOpen] = useState(false);
  const [alertasCount, setAlertasCount] = useState(0);

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
    const interval = setInterval(fetchAlertasCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchAlertasCount]);

  // Detecta el título según la ruta actual
  const matchedRoute = Object.keys(ROUTE_TITLES).find(
    (route) => pathname === route || (route !== '/admin/dashboard' && pathname.startsWith(route))
  );
  const currentTitle = matchedRoute ? ROUTE_TITLES[matchedRoute] : 'DASHBOARD';

  return (
    <div className="min-h-screen bg-neutral-50/50 flex font-['DM_Sans']">
      {/* SIDEBAR */}
      <Sidebar />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* NAVBAR DINÁMICO */}
        <header className="w-full h-16 px-8 bg-white border-b border-gray-200 flex items-center justify-between sticky top-0 z-30">
          {/* TÍTULO QUE CAMBIA SEGÚN EL MÓDULO */}
          <h1 className="text-xl font-black text-yellow-500 tracking-wider uppercase">
            {currentTitle}
          </h1>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAlertasOpen(true)}
              className="relative w-8 h-8 flex items-center justify-center text-neutral-700 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {alertasCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      <AlertasStockTable
        open={isAlertasOpen}
        onClose={() => setIsAlertasOpen(false)}
        onSuccess={() => fetchAlertasCount()}
      />
    </div>
  );
}
'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';
import { Settings } from 'lucide-react';

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
    </div>
  );
}
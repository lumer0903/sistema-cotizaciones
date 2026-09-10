'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  Tag,
  Users,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  BarChart3,
  Settings,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { PermisoModulo, Rol } from '@goldcontinent/shared/auth';

const ADMIN_NAV_ITEMS: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission: PermisoModulo;
  children?: { href: string; label: string }[];
}[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard' },
  { href: '/admin/productos', icon: Boxes, label: 'Inventario', permission: 'productos' },
  { href: '/admin/precios', icon: Tag, label: 'Precios e Historial', permission: 'consulta_precios' },
  {
    href: '/admin/cotizaciones',
    icon: FileText,
    label: 'Cotizaciones',
    permission: 'cotizaciones',
    children: [
      { href: '/admin/cotizaciones/crear', label: 'Crear cotización' },
      { href: '/admin/cotizaciones', label: 'Mis Cotizaciones' },
    ],
  },
  {
    href: '/admin/ventas',
    icon: Wallet,
    label: 'Ventas',
    permission: 'ventas',
    children: [
      { href: '/admin/ventas/crear', label: 'Crear venta' },
      { href: '/admin/ventas', label: 'Todas las ventas' },
    ],
  },
  { href: '/admin/cobranza', icon: Search, label: 'Cobranza', permission: 'cobranza' },
  { href: '/admin/reportes', icon: BarChart3, label: 'Reportes', permission: 'reportes' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios', permission: 'usuarios' },
  { href: '/admin/configuracion', icon: Settings, label: 'Configuración', permission: 'configuracion' },
];

export function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const { can } = usePermissions();

  const filteredItems = ADMIN_NAV_ITEMS.filter(item => can(item.permission));

  const isActive = (href: string) => pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));

  const handleMenuToggle = (itemHref: string) => {
    if (expandedMenu === itemHref) {
      setExpandedMenu(null);
    } else {
      setExpandedMenu(itemHref);
    }
  };

  return (
    <div 
      className="flex min-h-screen w-full bg-[#f7f7f7] text-[#414141]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* OVERLAY MOBILE */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVEGACIÓN */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col justify-between border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* LOGO */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between md:justify-center">
            <img
              src="/LOGO_GRANDE.svg"
              alt="Gold Continent"
              className="h-12 w-auto object-contain"
            />
            <button
              className="p-1 rounded-md text-gray-400 hover:text-[#f8b602] hover:bg-gray-50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* MENÚ */}
          <nav className="p-4 space-y-1 text-sm font-medium">
            {filteredItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isItemActive = isActive(item.href);
              const isExpanded = expandedMenu === item.href || (isItemActive && expandedMenu !== null);

              if (hasChildren) {
                return (
                  <div key={item.href} className="space-y-1">
                    <div 
                      onClick={() => handleMenuToggle(item.href)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                        isItemActive
                          ? 'bg-[#f8b602]/10 text-[#f8b602] font-bold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-5 h-5 ${isItemActive ? '' : 'text-gray-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    {isExpanded && (
                      <div className="pl-12 space-y-1 pt-1">
                        {item.children!.map((child) => {
                          const isChildActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`block py-2 text-xs transition-colors ${
                                isChildActive 
                                  ? 'text-[#f8b602] font-bold' 
                                  : 'text-gray-500 hover:text-gray-900'
                              }`}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isItemActive
                      ? 'bg-[#f8b602]/10 text-[#f8b602] font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isItemActive ? '' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT */}
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-500" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER SUPERIOR */}
        <header className="h-[80px] bg-white border-b border-gray-200 px-6 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="p-1 rounded-md text-gray-500 hover:text-[#f8b602] hover:bg-gray-50 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black text-[#f8b602] tracking-wider uppercase m-0">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center">
              <span className="font-bold text-gray-500 text-sm">
                {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'AD'}
              </span>
            </div>
            <Link href="/admin/configuracion" className="text-gray-600 hover:text-gray-900 cursor-pointer">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* ÁREA DE CONTENIDO */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
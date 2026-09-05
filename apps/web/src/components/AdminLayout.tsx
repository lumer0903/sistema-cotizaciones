'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
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
  CreditCard,
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
  { href: '/admin/productos', icon: Package, label: 'Inventario', permission: 'productos' },
  { href: '/admin/precios', icon: Tag, label: 'Precios e Historial', permission: 'consulta_precios' },
  {
    href: '/admin/cotizaciones',
    icon: FileText,
    label: 'Cotizaciones',
    permission: 'cotizaciones',
    children: [
      { href: '/admin/cotizaciones/crear', label: 'Crear cotización' },
      { href: '/admin/cotizaciones', label: 'Todas las cotizaciones' },
    ],
  },
  {
    href: '/admin/ventas',
    icon: CreditCard,
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

const ROLE_NAMES: Record<Rol, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

export function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const { can } = usePermissions();

  const userInitials = usuario?.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

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
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-primary-700 flex items-center justify-center text-white font-bold text-sm">G</div>
              <span className="font-semibold text-sm tracking-tight text-gray-900">Gold Continent Admin</span>
            </div>
            <button
              className="p-1 rounded-md text-gray-400 hover:text-primary-700 hover:bg-primary-50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1.5">
            {filteredItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isItemActive = isActive(item.href);
              const isExpanded = expandedMenu === item.href;

              return (
                <div key={item.href} className="space-y-1">
                  <Link
                    href={hasChildren ? '#' : item.href}
                    onClick={hasChildren ? () => handleMenuToggle(item.href) : () => setSidebarOpen(false)}
                    className={`
                      flex items-center justify-between rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150
                      ${isItemActive
                        ? 'bg-primary-700 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-primary-700'}
                    `}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className={`h-4 w-4 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {hasChildren ? (
                      isExpanded ? (
                        <ChevronDown className={`h-3.5 w-3.5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      ) : (
                        <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      )
                    ) : (
                      item.href !== '/admin/dashboard' && (
                        <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      )
                    )}
                  </Link>

                  {hasChildren && isExpanded && (
                    <div className="ml-5 pl-4 border-l border-gray-200 py-1 space-y-1">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            block rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors
                            ${pathname === child.href
                              ? 'text-primary-700 font-semibold bg-primary-50'
                              : 'text-gray-500 hover:text-primary-700 hover:bg-gray-50'}
                          `}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-gray-400 hover:bg-red-50 hover:text-red-650 transition-all duration-150"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 md:px-8">
          <div className="flex items-center gap-4">
            <button
              className="p-1 rounded-md text-gray-500 hover:text-primary-700 hover:bg-primary-50 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-900">{usuario?.nombre || 'Administrador'}</span>
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {usuario?.rol ? ROLE_NAMES[usuario.rol] : 'Admin'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary-700 text-white flex items-center justify-center text-[11px] font-bold shadow-xs hover:bg-primary-800 transition-colors select-none">
              {userInitials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
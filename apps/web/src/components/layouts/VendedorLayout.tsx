'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  CreditCard,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { PermisoModulo, Rol } from '@goldcontinent/shared/auth';

const VENDEDOR_NAV_ITEMS: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission: PermisoModulo;
  children?: { href: string; label: string }[];
}[] = [
  { href: '/vendedor/pos', icon: CreditCard, label: 'Punto de Venta', permission: 'ventas' },
  { href: '/vendedor/catalogo', icon: Package, label: 'Catálogo', permission: 'productos' },
  {
    href: '/vendedor/cotizaciones',
    icon: FileText,
    label: 'Mis Cotizaciones',
    permission: 'cotizaciones',
    children: [
      { href: '/vendedor/cotizaciones/crear', label: 'Crear cotización' },
      { href: '/vendedor/cotizaciones', label: 'Mis cotizaciones' },
    ],
  },
];

const ROLE_NAMES: Record<Rol, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

export function VendedorLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const { can } = usePermissions();

  const userInitials = usuario?.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VE';

  const filteredItems = VENDEDOR_NAV_ITEMS.filter(item => can(item.permission));

  const isActive = (href: string) => pathname === href || (href !== '/vendedor/pos' && pathname.startsWith(href));

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
              <div className="h-7 w-7 rounded-md bg-green-700 flex items-center justify-center text-white font-bold text-sm">G</div>
              <span className="font-semibold text-sm tracking-tight text-gray-900">Gold Continent</span>
            </div>
            <button
              className="p-1 rounded-md text-gray-400 hover:text-green-700 hover:bg-green-50 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-3">
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
                      flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-all duration-150
                      ${isItemActive
                        ? 'bg-green-700 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-green-700'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                        <item.icon className={`h-5 w-5 ${isItemActive ? 'text-white' : 'text-gray-600'}`} />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    {hasChildren ? (
                      isExpanded ? (
                        <ChevronDown className={`h-5 w-5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      ) : (
                        <ChevronRight className={`h-5 w-5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-400'}`} />
                      )
                    ) : null}
                  </Link>

                  {hasChildren && isExpanded && (
                    <div className="ml-4 pl-3 border-l-2 border-green-200 py-2 space-y-1">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                            ${pathname === child.href
                              ? 'text-green-700 font-semibold bg-green-50'
                              : 'text-gray-600 hover:text-green-700 hover:bg-gray-50'}
                          `}
                        >
                          <Plus className="h-4 w-4" />
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
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-650 transition-all duration-150"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="p-1 rounded-md text-gray-500 hover:text-green-700 hover:bg-green-50 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-900">{usuario?.nombre || 'Vendedor'}</span>
              <span className="text-[10px] font-semibold tracking-wider text-green-700 uppercase">
                {usuario?.rol ? ROLE_NAMES[usuario.rol] : 'Vendedor'}
              </span>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-700 text-white flex items-center justify-center text-[11px] font-bold shadow-xs hover:bg-green-800 transition-colors select-none">
              {userInitials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { PermisoModulo } from '@goldcontinent/shared/auth';
import { PerfilModal } from '@/features/usuarios/components/PerfilModal';
import { Avatar } from '@/components/ui/Avatar';
import { Breadcrumbs } from '@/components/shared/Breadcrumbs';

const VENDEDOR_NAV_ITEMS: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  permission: PermisoModulo;
  children?: { href: string; label: string }[];
}[] = [
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

const ROLE_NAMES: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

export function VendedorLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  const pathname = usePathname();
  const { usuario, logout } = useAuth();
  const { can } = usePermissions();

  const userInitials = usuario?.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VE';

  const filteredItems = VENDEDOR_NAV_ITEMS.filter(item => can(item.permission));

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Bloquea el scroll del body con el drawer abierto (igual que AdminLayout)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
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
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside id="menu-lateral" className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-gray-200 bg-white transition-[transform,visibility] duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible'}
      `}>
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-md bg-brand-primary flex items-center justify-center text-white font-bold text-sm">G</div>
              <span className="font-semibold text-sm tracking-tight text-gray-900">Gold Continent</span>
            </div>
            <button
              className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-md text-gray-500 hover:text-brand-ink hover:bg-brand-soft lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-3">
            {filteredItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isItemActive = isActive(item.href);
              const isExpanded = expandedMenu === item.href;

              return (
                <div key={item.href} className="space-y-1">
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => handleMenuToggle(item.href)}
                      className={`
                        w-full flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-all duration-150
                        ${isItemActive
                          ? 'bg-brand-primary text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-brand-ink'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                          <item.icon className={`h-5 w-5 ${isItemActive ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className={`h-5 w-5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-500'}`} />
                      ) : (
                        <ChevronRight className={`h-5 w-5 opacity-60 ${isItemActive ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-all duration-150
                        ${isItemActive
                          ? 'bg-brand-primary text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-brand-ink'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                          <item.icon className={`h-5 w-5 ${isItemActive ? 'text-white' : 'text-gray-600'}`} />
                        </div>
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  )}

                  {hasChildren && isExpanded && (
                    <div className="ml-4 pl-3 border-l-2 border-brand-primary/30 py-2 space-y-1">
                      {item.children!.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`
                            flex items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-11 text-sm font-medium transition-colors
                            ${pathname === child.href
                              ? 'text-brand-ink font-semibold bg-brand-soft'
                              : 'text-gray-600 hover:text-brand-ink hover:bg-gray-50'}
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

        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 min-h-11 text-sm font-medium text-gray-500 hover:bg-estado-rechazado-soft hover:text-danger transition-all duration-150"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded-md text-gray-500 hover:text-brand-ink hover:bg-brand-soft lg:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={sidebarOpen}
              aria-controls="menu-lateral"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Breadcrumbs accent="brand" />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-900">{usuario?.nombre || 'Vendedor'}</span>
              <span className="text-xs font-semibold tracking-wider text-brand-ink uppercase">
                {usuario?.rol ? ROLE_NAMES[usuario.rol] : 'Vendedor'}
              </span>
            </div>
            <Avatar
              src={usuario?.avatar_url}
              nombre={usuario?.nombre || userInitials}
              size="sm"
              onClick={() => setIsPerfilOpen(true)}
              title="Mi perfil"
              className="bg-brand-primary text-white border-transparent"
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      <PerfilModal open={isPerfilOpen} onClose={() => setIsPerfilOpen(false)} />
    </div>
  );
}
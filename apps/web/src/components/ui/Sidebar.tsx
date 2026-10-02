'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Package,
    Search,
    FileText,
    Wallet,
    BarChart3,
    Users,
    Settings,
    LogOut,
    ChevronDown,
    X,
} from 'lucide-react';
import { useAuth } from '@/lib/authProvider';

interface MenuItem {
    name: string;
    href: string;
    icon: React.ElementType;
    subItems?: { name: string; href: string }[];
}

const menuItems: MenuItem[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Inventario', href: '/admin/inventario', icon: Package },
    { name: 'Precio & Historial', href: '/admin/precios', icon: Search },
    {
        name: 'Cotizaciones',
        href: '/admin/cotizaciones',
        icon: FileText,
        subItems: [
            { name: 'Crear cotización', href: '/admin/cotizaciones/crear?nueva=1' },
            { name: 'Mis Cotizaciones', href: '/admin/cotizaciones' },
        ],
    },
    { name: 'Cobranza', href: '/admin/cobranza', icon: Wallet },
    { name: 'Reportes', href: '/admin/reportes', icon: BarChart3 },
    { name: 'Usuarios', href: '/admin/usuarios', icon: Users },
    { name: 'Configuración', href: '/admin/configuracion', icon: Settings },
];

function findActiveSubmenu(pathname: string): string | null {
    const activeParent = menuItems.find(
        (item) => item.subItems && pathname.startsWith(item.href)
    );
    return activeParent ? activeParent.name : null;
}

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => findActiveSubmenu(pathname));
    const [prevPathname, setPrevPathname] = useState(pathname);

    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        setOpenSubmenu(findActiveSubmenu(pathname));
    }

    const handleItemClick = (item: MenuItem) => {
        if (item.subItems) {
            setOpenSubmenu((prev) => (prev === item.name ? null : item.name));
        } else {
            setOpenSubmenu(null);
        }
    };

    return (
        <aside
            id="menu-lateral"
            className={`w-64 h-screen bg-white border-r border-zinc-200/80 flex flex-col justify-between fixed left-0 top-0 z-50 font-sans select-none transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div className="flex flex-col w-full flex-1 min-h-0">


                {/* LOGO SUPERIOR */}
                <div className="w-full px-1 py-4 flex items-center justify-between  min-h-[64px] overflow-hidden">
                    <Link
                        href="/admin/dashboard"
                        className="w-full flex justify-center items-center group overflow-hidden py-1"
                        onClick={onClose}
                    >
                        <Image
                            src="/LOGO_GRANDE.svg"
                            alt="Import & Export Gold Continent"
                            width={200}
                            height={60}
                            priority
                            className="w-full h-12 object-contain scale-[4] transition-transform duration-200 group-hover:scale-[3]"
                            onError={(e) => {
                                (e.target as HTMLElement).style.visibility = 'hidden';
                            }}
                        />
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden p-1 text-zinc-500 hover:text-zinc-800 z-10 ml-1"
                        aria-label="Cerrar menú"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* MENÚ DE NAVEGACIÓN: Con paddings internos dinámicos y bordes redondeados modernos */}
                <nav className="w-full flex flex-col flex-1 overflow-y-auto px-3.5 space-y-1 py-1">
                    {menuItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                        const isSubmenuOpen = openSubmenu === item.name;

                        if (hasSubItems) {
                            return (
                                <div key={item.name} className="w-full flex flex-col space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        className={`w-full h-11 px-3.5 py-2 rounded-xl inline-flex items-center justify-between gap-3 transition-all duration-200 ${isActive
                                            ? 'bg-brand-selection text-brand-ink font-bold shadow-sm shadow-brand-modalFocus/5'
                                            : 'text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-brand-ink' : 'text-zinc-500'}`} />
                                            <span className="text-xs sm:text-sm">{item.name}</span>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'text-brand-ink' : 'text-zinc-500'
                                                } ${isSubmenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* SUBMENÚ: Despliegue moderno tipo cápsula flotante */}
                                    {isSubmenuOpen && (
                                        <div className="w-full flex flex-col bg-zinc-50/60 rounded-xl p-1 mt-0.5 border border-zinc-100 space-y-0.5">
                                            {item.subItems?.map((sub) => {
                                                const isSubActive = pathname === sub.href.split('?')[0];
                                                return (
                                                    <Link
                                                        key={sub.name}
                                                        href={sub.href}
                                                        onClick={onClose}
                                                        className={`w-full h-9 pl-9 pr-4 rounded-lg inline-flex items-center text-xs sm:text-sm transition-all duration-150 ${isSubActive
                                                            ? 'text-brand-ink font-bold bg-white shadow-sm shadow-zinc-200/50'
                                                            : 'text-zinc-500 font-medium hover:text-zinc-700 hover:bg-white/60'
                                                            }`}
                                                    >
                                                        <span>{sub.name}</span>
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
                                onClick={() => {
                                    handleItemClick(item);
                                    onClose?.();
                                }}
                                className={`w-full h-11 px-3.5 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm transition-all duration-200 ${isActive
                                    ? 'bg-brand-selection text-brand-ink font-bold shadow-sm shadow-brand-modalFocus/5'
                                    : 'text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900'
                                    }`}
                            >
                                <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-brand-ink' : 'text-zinc-500'}`} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* SECCIÓN DE BOTÓN: CERRAR SESIÓN ESTILIZADO */}
            <div className="w-full p-3.5 border-t border-zinc-200/80">
                <button
                    type="button"
                    onClick={async () => {
                        await logout();
                        // Recarga completa intencional tras logout: descarta el
                        // estado de la SPA (datos en memoria de módulos).
                        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                        window.location.href = '/login';
                    }}
                    className="w-full h-11 px-4 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm text-zinc-500 font-semibold hover:bg-estado-rechazado-soft hover:text-danger active:bg-estado-rechazado-soft/80 transition-all duration-200 focus:outline-none"
                >
                    <LogOut className="w-4.5 h-4.5 text-zinc-500 transition-colors group-hover:text-danger" />
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}

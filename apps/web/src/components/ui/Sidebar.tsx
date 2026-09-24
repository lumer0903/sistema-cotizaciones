'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

export function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

    useEffect(() => {
        const activeParent = menuItems.find(
            (item) => item.subItems && pathname.startsWith(item.href)
        );
        if (activeParent) {
            setOpenSubmenu(activeParent.name);
        } else {
            setOpenSubmenu(null);
        }
    }, [pathname]);

    const handleItemClick = (item: MenuItem) => {
        if (item.subItems) {
            setOpenSubmenu((prev) => (prev === item.name ? null : item.name));
        } else {
            setOpenSubmenu(null);
        }
    };

    return (
        <aside className="w-64 h-screen bg-white border-r border-zinc-200/80 flex flex-col justify-between fixed left-0 top-0 z-40 font-['DM_Sans'] select-none">
            <div className="flex flex-col w-full">
                {/* LOGO SUPERIOR: Espaciado refinado y texto minimalista */}
                <div className="w-full pt-8 pb-6 flex justify-center items-center px-4">
                    <Link href="/admin/dashboard" className="text-center group">
                        <img
                            src="/logo.png"
                            alt="Import & Export Gold Continent"
                            className="w-48 h-12 object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.02]"
                            onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                            }}
                        />
                        <div className="text-center font-black text-[10px] text-zinc-800 tracking-widest uppercase leading-tight mt-1.5 transition-colors group-hover:text-brand-primary">
                            IMPORT &amp; EXPORT <br />
                            <span className="text-xs text-brand-primary tracking-wider">GOLD CONTINENT</span>
                        </div>
                    </Link>
                </div>

                {/* MENÚ DE NAVEGACIÓN: Con paddings internos dinámicos y bordes redondeados modernos */}
                <nav className="w-full flex flex-col overflow-y-auto max-h-[calc(100vh-170px)] px-3.5 space-y-1">
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
                                                ? 'bg-brand-selection text-brand-primary font-bold shadow-sm shadow-brand-modalFocus/5'
                                                : 'text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`} />
                                            <span className="text-xs sm:text-sm">{item.name}</span>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'text-brand-primary' : 'text-zinc-400'
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
                                                        className={`w-full h-9 pl-9 pr-4 rounded-lg inline-flex items-center text-xs sm:text-sm transition-all duration-150 ${isSubActive
                                                                ? 'text-brand-primary font-bold bg-white shadow-sm shadow-zinc-200/50'
                                                                : 'text-zinc-400 font-medium hover:text-zinc-700 hover:bg-white/60'
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
                                onClick={() => handleItemClick(item)}
                                className={`w-full h-11 px-3.5 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm transition-all duration-200 ${isActive
                                        ? 'bg-brand-selection text-brand-primary font-bold shadow-sm shadow-brand-modalFocus/5'
                                        : 'text-zinc-600 font-medium hover:bg-zinc-50 hover:text-zinc-900'
                                    }`}
                            >
                                <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? 'text-brand-primary' : 'text-zinc-400'}`} />
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
                        window.location.href = '/login';
                    }}
                    className="w-full h-11 px-4 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm text-zinc-500 font-semibold hover:bg-estado-rechazado-soft hover:text-danger active:bg-estado-rechazado-soft/80 transition-all duration-200 focus:outline-none"
                >
                    <LogOut className="w-4.5 h-4.5 text-zinc-400 transition-colors group-hover:text-danger" />
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}

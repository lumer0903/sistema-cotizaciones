'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
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
import { useDialogLayer } from '@/hooks/useDialogLayer';
import { useMobileViewport } from '@/hooks/useMobileViewport';
import { useAuth } from '@/lib/authProvider';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermisoModulo } from '@goldcontinent/shared/auth';

interface MenuItem {
    name: string;
    href: string;
    icon: React.ElementType;
    /** Permiso que gobierna la visibilidad del módulo en el menú. */
    modulo: PermisoModulo;
    /** Muestra el nombre largo con el historial (sólo admin/gerente). */
    historial?: boolean;
    subItems?: { name: string; href: string }[];
}

const menuItems: MenuItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, modulo: 'dashboard' },
    { name: 'Inventario', href: '/inventario', icon: Package, modulo: 'productos' },
    { name: 'Precios', href: '/precios', icon: Search, modulo: 'consulta_precios', historial: true },
    {
        name: 'Cotizaciones',
        href: '/cotizaciones',
        icon: FileText,
        modulo: 'cotizaciones',
        subItems: [
            { name: 'Crear cotización', href: '/cotizaciones/crear?nueva=1' },
            { name: 'Mis Cotizaciones', href: '/cotizaciones' },
        ],
    },
    { name: 'Cobranza', href: '/cobranza', icon: Wallet, modulo: 'cobranza' },
    { name: 'Reportes', href: '/reportes', icon: BarChart3, modulo: 'reportes' },
    { name: 'Usuarios', href: '/usuarios', icon: Users, modulo: 'usuarios' },
    { name: 'Configuración', href: '/configuracion', icon: Settings, modulo: 'configuracion' },
];

function findActiveSubmenu(pathname: string, items: MenuItem[]): string | null {
    const activeParent = items.find(
        (item) => item.subItems && pathname.startsWith(item.href)
    );
    return activeParent ? activeParent.name : null;
}

interface SidebarProps {
    open?: boolean;
    onClose?: () => void;
    onToggleLogo?: () => void;
    sidebarOpen?: boolean;
    setSidebarOpen?: (open: boolean) => void;
}

export function Sidebar({ open = false, onClose, onToggleLogo }: SidebarProps) {
    const mobile = useMobileViewport();
    const dialogRef = useDialogLayer(open && mobile, () => onClose?.());
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();
    const { can, isAdmin, isGerente } = usePermissions();

    // Visibilidad gobernada por la matriz de permisos del rol (pestaña Roles y Permisos).
    // El menú se actualiza solo cuando el admin cambia permisos.
    const visibleItems = menuItems.filter((item) => can(item.modulo, 'lectura'));

    // Tema: admin/gerente → ámbar; cualquier otro rol (VENDEDOR) → paleta roja.
    const temaClaro = isAdmin || isGerente;
    const activeItemCls = temaClaro
        ? 'bg-accent-selection text-accent-ink font-bold shadow-sm shadow-brand-modalFocus/5'
        : 'bg-vendedor-soft text-vendedor-ink font-bold shadow-sm';
    const activeIconCls = temaClaro ? 'text-accent-ink' : 'text-vendedor-ink';
    const activeSubCls = temaClaro
        ? 'text-accent-ink font-bold bg-surface shadow-sm shadow-zinc-200/50'
        : 'text-vendedor-ink font-bold bg-surface shadow-sm shadow-zinc-200/50';

    const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => findActiveSubmenu(pathname, visibleItems));
    const [prevPathname, setPrevPathname] = useState(pathname);

    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        setOpenSubmenu(findActiveSubmenu(pathname, visibleItems));
    }

    const handleItemClick = (item: MenuItem) => {
        if (item.subItems) {
            setOpenSubmenu((prev) => (prev === item.name ? null : item.name));
        } else {
            setOpenSubmenu(null);
        }
    };

    // El menú NO se cierra al navegar en escritorio (sólo con burger/X/Escape).
    // En móvil (<1024px) es un drawer sobre el contenido, así que sí se cierra
    // para no tapar la vista.
    const navegar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            onClose?.();
        }
    };

    return (
        <aside
            ref={dialogRef}
            tabIndex={-1}
            inert={!open}
            role={open && mobile ? "dialog" : undefined}
            aria-modal={open && mobile ? true : undefined}
            aria-label="Menú principal"
            id="menu-lateral"
            className={`w-64 h-screen bg-surface border-r border-border-default flex flex-col justify-between fixed left-0 top-0 z-50 font-sans select-none transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
            <div className="flex flex-col w-full flex-1 min-h-0">

                {/* LOGO SUPERIOR */}
                <div className="w-full px-3 py-3 flex items-center justify-between gap-2 min-h-[64px] bg-surface/80 backdrop-blur-sm border-b border-border-default/70">
                    <Link
                        href="/dashboard"
                        className="flex-1 min-w-0 flex justify-center items-center group py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring rounded-xl"
                        onClick={onToggleLogo}
                    >
                        <Image
                            src="/LOGO_GRANDE.svg"
                            alt="Import & Export Gold Continent"
                            width={200}
                            height={60}
                            priority
                            className="h-12 w-auto max-w-full object-contain transition-transform duration-150 group-hover:scale-105"
                            onError={(e) => {
                                (e.target as HTMLElement).style.visibility = 'hidden';
                            }}
                        />
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden p-1 text-brand-options hover:text-brand-subtitle z-10 ml-1 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        aria-label="Cerrar menú"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {/* MENÚ DE NAVEGACIÓN: Con paddings internos dinámicos y bordes redondeados modernos */}
                <nav className="w-full flex flex-col flex-1 overflow-y-auto px-3.5 space-y-1 py-1">
                    {visibleItems.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;
                        const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                        const isSubmenuOpen = openSubmenu === item.name;
                        const etiqueta =
                            item.historial && (isAdmin || isGerente) ? 'Precio & Historial' : item.name;

                        if (hasSubItems) {
                            return (
                                <div key={item.name} className="w-full flex flex-col space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        aria-expanded={isSubmenuOpen}
                                        className={`w-full h-11 px-3.5 py-2 rounded-xl inline-flex items-center justify-between gap-3 transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-[0.96] ${isActive
                                            ? activeItemCls
                                            : 'text-brand-subtitle font-medium hover:bg-surface-muted hover:text-brand-subtitle'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? activeIconCls : 'text-brand-options' }`} />
                                            <span className="text-xs sm:text-sm">{etiqueta}</span>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform duration-200 ${isActive ? activeIconCls : 'text-brand-options'
                                                } ${isSubmenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {/* SUBMENÚ: Despliegue moderno tipo cápsula flotante */}
                                    {isSubmenuOpen && (
                                        <div className="w-full flex flex-col bg-surface-muted/60 rounded-xl p-1 mt-0.5 border border-border-default space-y-0.5">
                                            {item.subItems?.filter(sub => !sub.href.startsWith('/cotizaciones/crear') || can('cotizaciones', 'edicion')).map((sub) => {
                                                const isSubActive = pathname === sub.href.split('?')[0];
                                                return (
                                                    <Link
                                                        key={sub.name}
                                                        href={sub.href}
                                                        onClick={navegar}
                                                        aria-current={isSubActive ? 'page' : undefined}
                                                        className={`w-full h-9 pl-9 pr-4 rounded-xl inline-flex items-center text-xs sm:text-sm transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-[0.96] ${isSubActive
                                                            ? activeSubCls
                                                            : 'text-brand-options font-medium hover:text-brand-subtitle hover:bg-surface/60'
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
                                    navegar();
                                }}
                                aria-current={isActive ? 'page' : undefined}
                                className={`w-full h-11 px-3.5 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-[0.96] ${isActive
                                    ? activeItemCls
                                    : 'text-brand-subtitle font-medium hover:bg-surface-muted hover:text-brand-subtitle'
                                    }`}
                            >
                                <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? activeIconCls : 'text-brand-options' }`} />
                                <span>{etiqueta}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* SECCIÓN DE BOTÓN: CERRAR SESIÓN ESTILIZADO */}
            <div className="w-full p-3.5 border-t border-border-default">
                <button
                    type="button"
                    onClick={async () => {
                        await logout();
                        router.push('/login');
                    }}
                    className="w-full h-11 px-4 py-2 rounded-xl inline-flex items-center gap-3 text-xs sm:text-sm text-brand-options font-semibold hover:bg-estado-rechazado-soft hover:text-danger active:bg-estado-rechazado-soft/80 transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:scale-[0.96]"
                >
                    <LogOut className="w-4.5 h-4.5 text-brand-options transition-colors group-hover:text-danger" />
                    <span>Cerrar sesión</span>
                </button>
            </div>
        </aside>
    );
}

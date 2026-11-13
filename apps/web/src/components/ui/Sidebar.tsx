'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function Sidebar({ open = false, onClose, onToggleLogo, collapsed = false }: SidebarProps) {
    const mobile = useMobileViewport();
    const dialogRef = useDialogLayer(open && mobile, () => onClose?.());
    const pathname = usePathname();
    const router = useRouter();
    const { logout } = useAuth();
    const { can, isAdmin, isGerente } = usePermissions();

    // Visibilidad gobernada por la matriz de permisos del rol (pestaña Roles y Permisos).
    // El menú se actualiza solo cuando el admin cambia permisos.
    const visibleItems = menuItems.filter((item) => can(item.modulo, 'lectura'));

    const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => findActiveSubmenu(pathname, visibleItems));
    const [prevPathname, setPrevPathname] = useState(pathname);
    const [cotizacionesPopoverOpen, setCotizacionesPopoverOpen] = useState(false);

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

    // En móvil (<1024px) es un drawer sobre el contenido, así que sí se cierra para no tapar la vista.
    const navegar = () => {
        setCotizacionesPopoverOpen(false);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            onClose?.();
        }
    };

    return (
        <aside
            ref={dialogRef}
            tabIndex={-1}
            inert={mobile && !open ? true : undefined}
            role={open && mobile ? 'dialog' : undefined}
            aria-modal={open && mobile ? true : undefined}
            aria-label="Menú principal"
            id="menu-lateral"
            className={`bg-white border-r border-[#E5E7EB] flex flex-col justify-between min-h-screen fixed left-0 top-0 z-50 select-none transition-all duration-200 ease-in-out ${
                mobile
                    ? `w-60 ${open ? 'translate-x-0' : '-translate-x-full'}`
                    : `${collapsed ? 'w-16' : 'w-60'} translate-x-0`
            }`}
        >
            <div className="flex flex-col w-full flex-1 min-h-0">
                {/* LOGO SUPERIOR */}
                <div className={`py-4 flex justify-center items-center ${collapsed && !mobile ? 'px-2' : 'px-4'}`}>
                    {collapsed && !mobile ? (
                        <Link
                            href="/dashboard"
                            className="size-9 rounded-xl bg-[#FFF8E6] border border-[#F8B602]/40 flex items-center justify-center font-black text-xs text-[#F8B602] hover:scale-105 transition-transform focus:outline-none"
                            title="IMPORT & EXPORT GOLD CONTINENT"
                            aria-label="IMPORT & EXPORT GOLD CONTINENT"
                            onClick={onToggleLogo}
                        >
                            GC
                        </Link>
                    ) : (
                        <Link
                            href="/dashboard"
                            className="flex-1 min-w-0 flex justify-center items-center group py-0.5 focus:outline-none rounded-lg"
                            onClick={onToggleLogo}
                        >
                            <Image
                                src="/LOGO_GRANDE.svg"
                                alt="Import & Export Gold Continent"
                                width={180}
                                height={42}
                                priority
                                className="w-44 h-10 object-contain transition-transform duration-150 group-hover:scale-105"
                            />
                        </Link>
                    )}
                </div>

                {/* MENÚ DE NAVEGACIÓN */}
                <nav className="w-full flex-1 flex flex-col overflow-y-auto pb-2 custom-scrollbar">
                    {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
                        const isSubmenuOpen = openSubmenu === item.name;
                        const isActive = pathname.startsWith(item.href);
                        const etiqueta = item.historial && (isAdmin || isGerente) ? 'Precio & Historial' : item.name;

                        // MODO COLAPSADO EN ESCRITORIO
                        if (collapsed && !mobile) {
                            if (hasSubItems) {
                                return (
                                    <div
                                        key={item.name}
                                        className="relative w-full py-1 flex justify-center"
                                        onMouseEnter={() => setCotizacionesPopoverOpen(true)}
                                        onMouseLeave={() => setCotizacionesPopoverOpen(false)}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCotizacionesPopoverOpen((prev) => !prev);
                                                router.push(item.href);
                                            }}
                                            title={etiqueta}
                                            aria-label={etiqueta}
                                            aria-expanded={cotizacionesPopoverOpen}
                                            className={`size-10 rounded-xl flex items-center justify-center transition-colors focus:outline-none cursor-pointer ${
                                                isActive
                                                    ? 'bg-[#FFF3E4] text-[#9D3A19] border border-[#F8B602]/50'
                                                    : 'text-[#414141] hover:bg-neutral-100 hover:text-[#F8B602]'
                                            }`}
                                        >
                                            <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                        </button>

                                        {/* Menú flotante compacto a la derecha */}
                                        {cotizacionesPopoverOpen && (
                                            <div className="absolute left-full top-0 ml-2 w-44 rounded-xl bg-white border border-[#E5E7EB] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                                <p className="px-2.5 py-1 text-[11px] font-bold text-[#8D8D8D] uppercase tracking-wider">
                                                    {etiqueta}
                                                </p>
                                                <div className="flex flex-col gap-0.5 mt-0.5">
                                                    {item.subItems
                                                        ?.filter(
                                                            (sub) =>
                                                                !sub.href.startsWith('/cotizaciones/crear') ||
                                                                can('cotizaciones', 'edicion')
                                                        )
                                                        .map((sub) => {
                                                            const isSubActive = pathname === sub.href.split('?')[0];
                                                            return (
                                                                <Link
                                                                    key={sub.name}
                                                                    href={sub.href}
                                                                    onClick={navegar}
                                                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                                                        isSubActive
                                                                            ? 'bg-[#F8B602]/15 text-[#9D3A19] font-bold'
                                                                            : 'text-[#414141] hover:bg-neutral-50 hover:text-[#F8B602]'
                                                                    }`}
                                                                >
                                                                    {sub.name}
                                                                </Link>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <div key={item.href} className="w-full py-1 flex justify-center">
                                    <Link
                                        href={item.href}
                                        onClick={navegar}
                                        title={etiqueta}
                                        aria-label={etiqueta}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={`size-10 rounded-xl flex items-center justify-center transition-colors focus:outline-none ${
                                            isActive
                                                ? 'bg-[#FFF3E4] text-[#9D3A19] border border-[#F8B602]/50'
                                                : 'text-[#414141] hover:bg-neutral-100 hover:text-[#F8B602]'
                                        }`}
                                    >
                                        <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
                                    </Link>
                                </div>
                            );
                        }

                        // MODO EXPANDIDO (O MÓVIL)
                        if (hasSubItems) {
                            return (
                                <div key={item.name} className="w-full flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => handleItemClick(item)}
                                        aria-expanded={isSubmenuOpen}
                                        className={`w-full h-10 px-4 py-2 border-l-4 flex items-center gap-2.5 text-[13px] font-normal transition-colors focus:outline-none cursor-pointer ${
                                            isActive
                                                ? 'bg-[#F8B602]/20 border-[#F8B602] text-[#414141]'
                                                : 'border-transparent text-[#414141] hover:bg-neutral-50'
                                        }`}
                                    >
                                        <Icon
                                            className={`size-4 transition-colors shrink-0 ${
                                                isActive ? 'text-[#F8B602]' : 'text-[#414141]'
                                            }`}
                                            strokeWidth={1.5}
                                        />
                                        <span className="flex-1 text-left truncate">{etiqueta}</span>
                                        <ChevronDown
                                            className={`size-3.5 ml-auto transition-transform duration-200 shrink-0 ${
                                                isSubmenuOpen ? 'rotate-180 text-[#F8B602]' : 'text-[#414141]'
                                            }`}
                                            strokeWidth={1.5}
                                        />
                                    </button>

                                    {/* SUBMENÚ de Cotizaciones */}
                                    {isSubmenuOpen && (
                                        <div className="w-full flex flex-col">
                                            {item.subItems
                                                ?.filter(
                                                    (sub) =>
                                                        !sub.href.startsWith('/cotizaciones/crear') ||
                                                        can('cotizaciones', 'edicion')
                                                )
                                                .map((sub) => {
                                                    const isSubActive = pathname === sub.href.split('?')[0];
                                                    return (
                                                        <Link
                                                            key={sub.name}
                                                            href={sub.href}
                                                            onClick={navegar}
                                                            aria-current={isSubActive ? 'page' : undefined}
                                                            className={`pl-11 pr-4 h-9 flex items-center text-[12px] font-medium transition-colors focus:outline-none ${
                                                                isSubActive
                                                                    ? 'text-[#F8B602]'
                                                                    : 'text-[#8D8D8D] hover:text-[#414141]'
                                                            }`}
                                                        >
                                                            {sub.name}
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
                                className={`w-full h-10 px-4 py-2 border-l-4 flex items-center gap-2.5 text-[13px] font-normal transition-colors focus:outline-none ${
                                    isActive
                                        ? 'bg-[#F8B602]/20 border-[#F8B602] text-[#414141]'
                                        : 'border-transparent text-[#414141] hover:bg-neutral-50'
                                }`}
                            >
                                <Icon
                                    className={`size-4 transition-colors shrink-0 ${
                                        isActive ? 'text-[#F8B602]' : 'text-[#414141]'
                                    }`}
                                    strokeWidth={1.5}
                                />
                                <span className="flex-1 text-left truncate">{etiqueta}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* PIE DEL SIDEBAR: Cerrar Sesión */}
            {collapsed && !mobile ? (
                <div className="w-full py-3 border-t border-[#E5E7EB] flex justify-center shrink-0">
                    <button
                        type="button"
                        onClick={async () => {
                            await logout();
                            router.push('/login');
                        }}
                        title="Cerrar Sesión"
                        aria-label="Cerrar Sesión"
                        className="size-10 rounded-xl flex items-center justify-center text-[#575757] hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer focus:outline-none"
                    >
                        <LogOut className="size-5 shrink-0" strokeWidth={1.5} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={async () => {
                        await logout();
                        router.push('/login');
                    }}
                    className="w-full h-12 px-4 border-t border-[#E5E7EB] shadow-[0_-2px_6px_rgba(0,0,0,0.04)] flex items-center gap-2.5 text-[13px] font-medium text-[#414141] hover:bg-neutral-50 transition-colors cursor-pointer text-left shrink-0 focus:outline-none"
                >
                    <LogOut className="size-4 text-[#414141] shrink-0" strokeWidth={1.5} />
                    <span>Cerrar Sesión</span>
                </button>
            )}
        </aside>
    );
}

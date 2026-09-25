'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

type Resolver = 'cotizacion' | 'cobranza';

interface RouteDef {
  /** Patrón con segmentos exactos y comodines `[id]` */
  pattern: string;
  /** Migas estáticas (prefijo). La última miga dinámica se agrega con `resolve`. */
  items: BreadcrumbItem[];
  resolve?: { resolver: Resolver; fallback: string };
}

/**
 * Registro completo de rutas → migas de pan (admin + vendedor).
 * Ordenar implícitamente por especificidad en `matchRoute` (más segmentos fijos primero).
 */
const ROUTES: RouteDef[] = [
  // ── Admin ──────────────────────────────────────────────
  { pattern: '/admin/dashboard', items: [{ label: 'Dashboard' }] },
  { pattern: '/admin/inventario', items: [{ label: 'Inventario' }] },
  { pattern: '/admin/precios', items: [{ label: 'Precio & Historial' }] },
  { pattern: '/admin/reportes', items: [{ label: 'Reportes' }] },
  { pattern: '/admin/usuarios', items: [{ label: 'Usuarios' }] },
  { pattern: '/admin/configuracion', items: [{ label: 'Configuración' }] },
  { pattern: '/admin/productos', items: [{ label: 'Productos' }] },
  {
    pattern: '/admin/productos/crear',
    items: [
      { label: 'Productos', href: '/admin/productos' },
      { label: 'Crear producto' },
    ],
  },
  {
    pattern: '/admin/cotizaciones',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Mis Cotizaciones' },
    ],
  },
  {
    pattern: '/admin/cotizaciones/crear',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Crear Cotización' },
    ],
  },
  {
    pattern: '/admin/cotizaciones/crear/resumen',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Crear Cotización', href: '/admin/cotizaciones/crear' },
      { label: 'Resumen' },
    ],
  },
  {
    pattern: '/admin/cotizaciones/editar/[id]',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Mis Cotizaciones', href: '/admin/cotizaciones' },
    ],
    resolve: { resolver: 'cotizacion', fallback: 'Cotización' },
  },
  {
    pattern: '/admin/cotizaciones/detalle/[id]',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Mis Cotizaciones', href: '/admin/cotizaciones' },
    ],
    resolve: { resolver: 'cotizacion', fallback: 'Cotización' },
  },
  {
    pattern: '/admin/cotizaciones/pdf/[id]',
    items: [
      { label: 'Cotizaciones', href: '/admin/cotizaciones' },
      { label: 'Mis Cotizaciones', href: '/admin/cotizaciones' },
    ],
    resolve: { resolver: 'cotizacion', fallback: 'Cotización' },
  },
  { pattern: '/admin/cobranza', items: [{ label: 'Cobranza' }] },
  {
    pattern: '/admin/cobranza/[id]',
    items: [{ label: 'Cobranza', href: '/admin/cobranza' }],
    resolve: { resolver: 'cobranza', fallback: 'Cobranza' },
  },

  // ── Vendedor ───────────────────────────────────────────
  { pattern: '/vendedor/catalogo', items: [{ label: 'Catálogo' }] },
  {
    pattern: '/vendedor/cotizaciones',
    items: [
      { label: 'Cotizaciones', href: '/vendedor/cotizaciones' },
      { label: 'Mis Cotizaciones' },
    ],
  },
  {
    pattern: '/vendedor/cotizaciones/crear',
    items: [
      { label: 'Cotizaciones', href: '/vendedor/cotizaciones' },
      { label: 'Mis Cotizaciones', href: '/vendedor/cotizaciones' },
      { label: 'Crear Cotización' },
    ],
  },
  {
    pattern: '/vendedor/cotizaciones/pdf/[id]',
    items: [
      { label: 'Cotizaciones', href: '/vendedor/cotizaciones' },
      { label: 'Mis Cotizaciones', href: '/vendedor/cotizaciones' },
    ],
    resolve: { resolver: 'cotizacion', fallback: 'Cotización' },
  },
];

interface RouteMatch {
  items: BreadcrumbItem[];
  pending?: { resolver: Resolver; id: string; fallback: string };
}

function matchRoute(pathname: string): RouteMatch | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const segs = path.split('/').filter(Boolean);

  const scored = ROUTES.map((route) => {
    const patternSegs = route.pattern.split('/').filter(Boolean);
    if (patternSegs.length !== segs.length) return null;

    let fixed = 0;
    for (let i = 0; i < patternSegs.length; i++) {
      if (patternSegs[i] === '[id]') continue;
      if (patternSegs[i] !== segs[i]) return null;
      fixed++;
    }
    return { route, fixed };
  })
    .filter((m): m is { route: RouteDef; fixed: number } => m !== null)
    .sort((a, b) => b.fixed - a.fixed);

  if (scored.length === 0) return null;

  const { route } = scored[0];
  const match: RouteMatch = { items: [...route.items] };

  if (route.resolve) {
    const id = segs[segs.length - 1];
    match.pending = { resolver: route.resolve.resolver, id, fallback: route.resolve.fallback };
  }

  return match;
}

/** Fallback: etiquetas derivadas de los segmentos de la URL (nunca "Dashboard" incorrecto). */
function humanizeFallback(pathname: string): BreadcrumbItem[] {
  const segs = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  return segs.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: i < segs.length - 1 ? `/${segs.slice(0, i + 1).join('/')}` : undefined,
  }));
}

async function fetchDynamicLabel(resolver: Resolver, id: string): Promise<string> {
  if (resolver === 'cotizacion') {
    const res = await apiClient(`/cotizaciones/${id}`);
    const data = res?.data ?? res;
    return data?.numero || `COT-${id}`;
  }

  const res = await apiClient(`/cobranza/${id}`);
  const data = res?.data ?? res;
  return data?.numero || '';
}

interface BreadcrumbsProps {
  /** Color de la última miga cuando hay más de un nivel. */
  accent?: 'amber' | 'brand';
}

// Tamaño decreciente por nivel: el módulo principal (índice 0) es el más grande
const LEVEL_SIZES = ['text-xl', 'text-lg', 'text-base', 'text-sm'];
const SEPARATOR_SIZES = ['w-4 h-4', 'w-3.5 h-3.5', 'w-3 h-3', 'w-3 h-3'];

export function Breadcrumbs({ accent = 'amber' }: BreadcrumbsProps) {
  const pathname = usePathname();
  const [dynamicLabel, setDynamicLabel] = useState<string | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setDynamicLabel(null);
  }

  useEffect(() => {
    const match = matchRoute(pathname);
    if (!match?.pending) {
      return;
    }

    let cancelled = false;

    fetchDynamicLabel(match.pending.resolver, match.pending.id)
      .then((label) => {
        if (!cancelled) setDynamicLabel(label || match.pending!.fallback);
      })
      .catch(() => {
        if (!cancelled) setDynamicLabel(match.pending!.fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const match = matchRoute(pathname);
  const baseItems = match ? match.items : humanizeFallback(pathname);

  const items: BreadcrumbItem[] = [...baseItems];
  if (match?.pending) {
    items.push({ label: dynamicLabel ?? '…' });
  }

  const lastAccent =
    items.length > 1
      ? accent === 'brand'
        ? 'text-brand-primary'
        : 'text-amber-500'
      : 'text-neutral-700';

  const sizeFor = (index: number) =>
    LEVEL_SIZES[Math.min(index, LEVEL_SIZES.length - 1)];
  const separatorFor = (index: number) =>
    SEPARATOR_SIZES[Math.min(index, SEPARATOR_SIZES.length - 1)];

  return (
    <nav aria-label="Breadcrumb" className="inline-flex items-center gap-2.5">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const href = item.href && !isLast && item.href !== pathname ? item.href : undefined;
        const size = sizeFor(index);

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight
                className={`${separatorFor(index)} text-neutral-700 stroke-[2.5] shrink-0`}
              />
            )}

            {href ? (
              <Link
                href={href}
                className={`text-neutral-700 ${size} font-extrabold font-['DM_Sans'] hover:text-neutral-900 transition-colors`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`${size} font-extrabold font-['DM_Sans'] ${
                  isLast ? lastAccent : 'text-neutral-700'
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_ROUTES = ['/admin'];
const VENDEDOR_ROUTES = ['/vendedor'];
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/refresh'];

const encoder = new TextEncoder();

/** Claves de verificación. Sin secreto → falla cerrado (sin sesión). */
function getKeys(): { access: Uint8Array | null; refresh: Uint8Array | null } {
  const access = process.env.JWT_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;
  if (!access || !refresh) {
    if (!proxyWarned) {
      proxyWarned = true;
      console.error(
        '[proxy] JWT_SECRET/JWT_REFRESH_SECRET no definidos: se bloquea la sesión (fail closed).',
      );
    }
  }
  return {
    access: access ? encoder.encode(access) : null,
    refresh: refresh ? encoder.encode(refresh) : null,
  };
}

let proxyWarned = false;

interface TokenCheck {
  ok: boolean;
  /** Rol presente en el payload verificado (sólo aplica a access token). */
  rol: string | null;
}

async function verifyToken(token: string | undefined, key: Uint8Array | null): Promise<TokenCheck> {
  if (!token || !key) return { ok: false, rol: null };
  try {
    const { payload } = await jwtVerify(token, key);
    return { ok: true, rol: typeof payload.rol === 'string' ? payload.rol : null };
  } catch {
    return { ok: false, rol: null };
  }
}

// Proxy (antes middleware) con runtime Node de Next 16: acceso a process.env
// en runtime para verificar el JWT con jose (en edge el secreto quedaría
// inyectado en build: inseguro). Verifica firma+expiración y gating por rol.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const { access, refresh } = getKeys();

  // Verificación real de firma+expiración (jose, compatible edge/node).
  const accessCheck = await verifyToken(request.cookies.get('accessToken')?.value, access);
  // Con access válido no hace falta más: el rol sale del token firmado.
  const refreshCheck = accessCheck.ok
    ? { ok: true, rol: null }
    : await verifyToken(request.cookies.get('refreshToken')?.value, refresh);

  const hasSession = accessCheck.ok || refreshCheck.ok;

  // Access token verificado → rol de confianza. Sólo refresh válido → la cookie
  // userRole (escrita por el cliente) se usa como pista de UI; la autorización
  // real siempre la exige la API con el JWT verificado.
  const userRole = accessCheck.ok
    ? accessCheck.rol
    : request.cookies.get('userRole')?.value ?? null;

  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  const isVendedorRoute = VENDEDOR_ROUTES.some((route) => pathname.startsWith(route));
  const isProtectedArea = isAdminRoute || isVendedorRoute;

  // Rutas protegidas: sin sesión o sin rol → login
  if (isProtectedArea && (!hasSession || !userRole)) {
    const redirectUrl = encodeURIComponent(pathname + request.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?redirectTo=${redirectUrl}`, request.url));
  }

  if (isAdminRoute && userRole && !['admin', 'gerente'].includes(userRole)) {
    return NextResponse.redirect(new URL('/vendedor/cotizaciones', request.url));
  }

  if (isVendedorRoute && userRole && userRole !== 'vendedor') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (pathname === '/') {
    if (!hasSession || !userRole) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole === 'vendedor') {
      return NextResponse.redirect(new URL('/vendedor/cotizaciones', request.url));
    }
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};

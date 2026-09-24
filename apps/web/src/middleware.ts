import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_ROUTES = ['/admin'];
const VENDEDOR_ROUTES = ['/vendedor'];
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/refresh'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const userRole = request.cookies.get('userRole')?.value;
  const hasSession = Boolean(accessToken || refreshToken);

  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isVendedorRoute = VENDEDOR_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedArea = isAdminRoute || isVendedorRoute;

  // Rutas protegidas: sin sesión o sin cookie de rol → login
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

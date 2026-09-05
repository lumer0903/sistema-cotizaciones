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

  if (!accessToken && !refreshToken) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));
  const isVendedorRoute = VENDEDOR_ROUTES.some(route => pathname.startsWith(route));

  const response = NextResponse.next();

  if (isAdminRoute) {
    const userRole = request.cookies.get('userRole')?.value;
    if (userRole && !['admin', 'gerente'].includes(userRole)) {
      return NextResponse.redirect(new URL('/vendedor/pos', request.url));
    }
  }

  if (isVendedorRoute) {
    const userRole = request.cookies.get('userRole')?.value;
    if (userRole && userRole !== 'vendedor') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  if (pathname === '/') {
    const userRole = request.cookies.get('userRole')?.value;
    if (userRole === 'vendedor') {
      return NextResponse.redirect(new URL('/vendedor/pos', request.url));
    }
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
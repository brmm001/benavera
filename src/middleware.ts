import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getAdminToken } from '@/lib/auth-config';

const LOGIN_PAGE = '/admin/login';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Página de login — se já estiver autenticado, manda para leads
  if (pathname.startsWith(LOGIN_PAGE)) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token && token === getAdminToken()) {
      return NextResponse.redirect(new URL('/admin/leads', request.url));
    }
    return NextResponse.next();
  }

  // Verificação de auth para /admin/* e /api/admin/*
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = !!token && token === getAdminToken();

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
  }

  // /admin e /admin/ → /admin/leads
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

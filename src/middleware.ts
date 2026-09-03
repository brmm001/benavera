import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'bv_admin';
const LOGIN_PAGE = '/admin/login';

function getExpectedToken(): string {
  return process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
}

const PUBLIC_PATHS = [LOGIN_PAGE];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const expected = getExpectedToken();
  const isAuthenticated = !!token && token === expected;

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PAGE;
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  // Se acessar a raiz do admin, redireciona para leads
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};

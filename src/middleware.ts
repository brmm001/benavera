import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getAdminToken } from '@/lib/auth-config';
import { verifyPortalToken, PORTAL_COOKIE } from '@/lib/portal-auth';

const LOGIN_PAGE = '/admin/login';
const PORTAL_LOGIN_PAGE = '/portal/login';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portal da clinica (/portal/*)
  if (pathname.startsWith('/portal')) {
    if (pathname === PORTAL_LOGIN_PAGE || pathname === '/portal/login/') {
      const portalToken = request.cookies.get(PORTAL_COOKIE)?.value;
      if (portalToken) {
        const session = await verifyPortalToken(portalToken);
        if (session) {
          return NextResponse.redirect(new URL('/portal/dashboard', request.url));
        }
      }
      return NextResponse.next();
    }

    const portalToken = request.cookies.get(PORTAL_COOKIE)?.value;
    if (!portalToken) {
      return NextResponse.redirect(new URL(PORTAL_LOGIN_PAGE, request.url));
    }
    const session = await verifyPortalToken(portalToken);
    if (!session) {
      const response = NextResponse.redirect(new URL(PORTAL_LOGIN_PAGE, request.url));
      response.cookies.delete(PORTAL_COOKIE);
      return response;
    }

    if (pathname === '/portal' || pathname === '/portal/') {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    return NextResponse.next();
  }

  // Admin interno (/admin/*)
  if (pathname.startsWith(LOGIN_PAGE)) {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token && token === getAdminToken()) {
      return NextResponse.redirect(new URL('/admin/leads', request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = !!token && token === getAdminToken();

  if (!isAuthenticated) {
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Nao autorizado.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL(LOGIN_PAGE, request.url));
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/portal/:path*'],
};

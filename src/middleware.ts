import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'bv_admin';
const LOGIN_PAGE = '/admin/login';

function getAdminToken(): string {
  // IMPORTANTE: process.env funciona no Edge Runtime do Next.js
  return process.env.ADMIN_SECRET ?? 'bv-secure-token-9x2k7p4m8q1r';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Páginas públicas do admin (login, assets, etc.)
  if (pathname.startsWith(LOGIN_PAGE)) {
    // Se já estiver autenticado e tentar acessar o login → redireciona para leads
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (token && token === getAdminToken()) {
      return NextResponse.redirect(new URL('/admin/leads', request.url));
    }
    return NextResponse.next();
  }

  // Verificação de autenticação para todas as outras rotas /admin e /api/admin
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = !!token && token === getAdminToken();

  if (!isAuthenticated) {
    // Rotas de API retornam JSON 401
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado.' },
        { status: 401 }
      );
    }

    // Rotas de página redirecionam para login
    const loginUrl = new URL(LOGIN_PAGE, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redireciona /admin e /admin/ para /admin/leads
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

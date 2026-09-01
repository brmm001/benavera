import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas Administrativas
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('benavera_admin_token')?.value;
    const isAuthenticated = !!adminToken && adminToken.length > 10;

    // Redireciona /admin para /admin/leads (se autenticado) ou /admin/login
    if (pathname === '/admin' || pathname === '/admin/') {
      const target = isAuthenticated ? '/admin/leads' : '/admin/login';
      const response = NextResponse.redirect(new URL(target, request.url));
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }

    // Se tentar acessar /admin/login estando autenticado, vai para /admin/leads
    if (pathname === '/admin/login' && isAuthenticated) {
      const response = NextResponse.redirect(new URL('/admin/leads', request.url));
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }

    // Se tentar acessar rotas internas como /admin/leads sem autenticação, vai para /admin/login
    if (pathname.startsWith('/admin/leads') && !isAuthenticated) {
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }

    // Para todas as respostas sob /admin, adiciona proteção contra indexação
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

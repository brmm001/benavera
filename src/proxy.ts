import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'bv_admin';

function getExpectedToken(): string {
  return process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Só atua em rotas /admin e /api/admin
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // Rotas de autenticação: sempre liberadas
  if (pathname.startsWith('/api/admin/auth/')) {
    return NextResponse.next();
  }

  // Página de login: sempre liberada
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Verifica o cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const expectedToken = getExpectedToken();
  const isAuthenticated = !!token && token === expectedToken;

  if (!isAuthenticated) {
    // API retorna 401
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    // Página redireciona para login
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Autenticado e tentando acessar /admin ou /admin/ → manda para /admin/leads
  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/leads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

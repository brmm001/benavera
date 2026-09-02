import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'bv_admin';
const LOGIN_PAGE = '/admin/login';

/**
 * Retorna o token esperado no cookie — mesmo fallback usado em security.ts e na rota de login.
 */
function getExpectedToken(): string {
  return process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
}

/**
 * Rotas que NÃO precisam de autenticação (excluídas do matcher abaixo via config,
 * mas mantidas aqui como referência de segurança).
 */
const PUBLIC_PATHS = [LOGIN_PAGE, '/api/admin/auth/login', '/api/admin/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa passar rotas públicas do admin
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const expected = getExpectedToken();
  const isAuthenticated = !!token && token === expected;

  if (!isAuthenticated) {
    // Se for chamada de API, retorna 401 (para a página de leads detectar e redirecionar)
    if (pathname.startsWith('/api/admin')) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Para páginas, redireciona para o login
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PAGE;
    loginUrl.search = '';
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};

// src/middleware.ts
// Middleware de autenticação e proteção de rotas privadas Benavera

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'benavera-secret-dev-2026-change-in-production'
);
const COOKIE_NAME = 'benavera_session';

// Apenas estas rotas e prefixos exigem login.
// TODAS as outras rotas (incluindo /, /clinicas, /simular, /como-funciona, /calculadoras, /sobre, /conteudos, /proposta/*, etc.) são 100% PÚBLICAS.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/novo-financiamento',
  '/financiamentos',
  '/pacientes',
  '/repasses',
  '/equipe',
  '/configuracoes',
  '/admin',
  '/api/applications',
  '/api/dashboard',
  '/api/patients',
  '/api/payouts',
  '/api/partners',
  '/api/admin',
];

// Exceções públicas dentro dos prefixos protegidos (se houver)
const PUBLIC_EXCEPTIONS = [
  '/admin/login',
  '/api/admin/debug',
];

function isProtectedRoute(pathname: string): boolean {
  // Arquivos estáticos e rotas do Next.js nunca são protegidos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple-icon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/llms') ||
    pathname.includes('.')
  ) {
    return false;
  }

  // Verifica exceções públicas
  if (PUBLIC_EXCEPTIONS.some(exc => pathname.startsWith(exc))) {
    return false;
  }

  // Verifica se a rota está na lista restrita
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se NÃO for uma rota protegida, permite acesso imediato e livre
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Obter token de sessão para rotas protegidas
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Se for chamada de API protegida, retornar 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    // Redirecionar usuário para login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Controle de acesso por perfil:
    // Apenas BENAVERA_ADMIN e BENAVERA_ANALYST podem acessar /admin
    if (pathname.startsWith('/admin')) {
      if (role !== 'BENAVERA_ADMIN' && role !== 'BENAVERA_ANALYST') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Usuários Benavera redirecionam de /dashboard para /admin
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/novo-financiamento') ||
      pathname.startsWith('/financiamentos') ||
      pathname.startsWith('/pacientes') ||
      pathname.startsWith('/repasses') ||
      pathname.startsWith('/equipe') ||
      pathname.startsWith('/configuracoes')
    ) {
      if (role === 'BENAVERA_ADMIN' || role === 'BENAVERA_ANALYST') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }

    // Passar headers de sessão para as rotas
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId || ''));
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-clinic-id', String(payload.clinicId || ''));
    requestHeaders.set('x-user-name', String(payload.name || ''));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Token inválido ou expirado
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas para validação, exceto arquivos estáticos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
};

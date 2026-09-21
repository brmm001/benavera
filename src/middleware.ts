// src/middleware.ts
// Middleware de autenticação e proteção de rotas privadas Benavera

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'benavera-secret-dev-2026-change-in-production'
);

// Cookie do sistema JWT completo (clínicas e futuros usuários)
const JWT_COOKIE = 'benavera_session';
// Cookie do sistema de admin de senha única (sistema existente)
const BV_ADMIN_COOKIE = 'bv_admin';

// Apenas estas rotas e prefixos exigem login.
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

// Exceções públicas dentro dos prefixos protegidos
const PUBLIC_EXCEPTIONS = [
  '/admin/login',
  '/api/admin/debug',
];

function isProtectedRoute(pathname: string): boolean {
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
  if (PUBLIC_EXCEPTIONS.some(exc => pathname.startsWith(exc))) {
    return false;
  }
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se NÃO for uma rota protegida, permite acesso livre
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Rotas de página do admin (/admin/*) ───────────────────────────────────
  // Usam o sistema de senha única existente (cookie bv_admin)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
    const bvToken = request.cookies.get(BV_ADMIN_COOKIE)?.value;
    const expectedToken = process.env.ADMIN_SECRET ?? 'bv-secure-token-9x2k7p4m8q1r';
    if (!bvToken || bvToken !== expectedToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // ── APIs do admin (/api/admin/*) ──────────────────────────────────────────
  // A validação real é feita via getAdminSession() em cada handler,
  // que aceita tanto bv_admin quanto benavera_session.
  // O middleware deixa passar — a auth é feita no handler.
  if (pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  // ── Outras rotas protegidas (clínicas, dashboard) ─────────────────────────
  // Usam o sistema JWT (benavera_session)
  const token = request.cookies.get(JWT_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    const benaveraRoles = new Set([
      'BENAVERA_ADMIN', 'BENAVERA_ANALYST', 'BENAVERA_COMPLIANCE',
      'BENAVERA_COMERCIAL', 'BENAVERA_FINANCEIRO', 'BENAVERA_SUPORTE',
    ]);

    // Usuários Benavera com JWT redirecionam de /dashboard para /admin
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/novo-financiamento') ||
      pathname.startsWith('/financiamentos') ||
      pathname.startsWith('/pacientes') ||
      pathname.startsWith('/repasses') ||
      pathname.startsWith('/equipe') ||
      pathname.startsWith('/configuracoes')
    ) {
      if (benaveraRoles.has(role)) {
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
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(JWT_COOKIE);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
};

// src/middleware.ts
// Middleware de autenticação e proteção de rotas privadas Benavera

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'benavera-secret-dev-2026-change-in-production'
);

// Cookie do sistema JWT completo
const JWT_COOKIE = 'benavera_session';

// Cookie legado do admin (senha única)
const BV_ADMIN_COOKIE = 'bv_admin';

// Prefixos que exigem autenticação
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/novo-financiamento',
  '/financiamentos',
  '/pacientes',
  '/repasses',
  '/equipe',
  '/configuracoes',
  '/admin',
  '/api/admin',
  '/api/applications',
  '/api/dashboard',
  '/api/patients',
  '/api/payouts',
  '/api/partners',
  '/atendente',
  '/api/atendente',
];

// Exceções públicas dentro dos prefixos protegidos
const PUBLIC_EXCEPTIONS = [
  '/admin/login',
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
  if (PUBLIC_EXCEPTIONS.some(exc => pathname === exc || pathname.startsWith(exc + '/'))) {
    return false;
  }
  return PROTECTED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
}

// Roles válidas do staff Benavera
const BENAVERA_ADMIN_ROLES = new Set([
  'BENAVERA_ADMIN', 'BENAVERA_ANALYST', 'BENAVERA_COMPLIANCE',
  'BENAVERA_FINANCEIRO', 'BENAVERA_SUPORTE',
]);
const BENAVERA_ALL_ROLES = new Set([
  ...BENAVERA_ADMIN_ROLES,
  'BENAVERA_COMERCIAL',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Sempre público: login/logout do atendente e toda a API de auth ────────
  if (pathname === '/atendente/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Rota não protegida → libera
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // ── Rota protegida: verifica JWT ──────────────────────────────────────────
  const token = request.cookies.get(JWT_COOKIE)?.value;

  // ── Admin routes: tentam JWT primeiro, fallback para bv_admin ─────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {

    // 1) Tentar JWT
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;

        // BENAVERA_COMERCIAL não pode acessar admin → redireciona pro atendente
        if (role === 'BENAVERA_COMERCIAL') {
          return NextResponse.redirect(new URL('/atendente', request.url));
        }

        // Só roles admin podem acessar /admin
        if (BENAVERA_ADMIN_ROLES.has(role)) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('x-user-id', String(payload.userId || ''));
          requestHeaders.set('x-user-role', role);
          requestHeaders.set('x-clinic-id', String(payload.clinicId || ''));
          requestHeaders.set('x-user-name', String(payload.name || ''));
          return NextResponse.next({ request: { headers: requestHeaders } });
        }

        // Role inválida para admin
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Sem permissão para acessar o painel administrativo.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
      } catch {
        // JWT inválido — continua para fallback bv_admin
      }
    }

    // 2) Fallback: cookie bv_admin (senha única legada)
    const bvToken = request.cookies.get(BV_ADMIN_COOKIE)?.value;
    const expectedToken = process.env.ADMIN_SECRET ?? 'bv-secure-token-9x2k7p4m8q1r';
    if (bvToken && bvToken === expectedToken) {
      // Admin legado autenticado
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', 'a1000001-0001-4001-a001-000000000001');
      requestHeaders.set('x-user-role', 'BENAVERA_ADMIN');
      requestHeaders.set('x-user-name', 'Admin Benavera');
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // 3) Sem autenticação válida
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // ── Rotas não-admin protegidas ────────────────────────────────────────────
  if (!token) {
    // Sem sessão → redireciona para o login correto por contexto
    const isAtendenteRoute = pathname.startsWith('/atendente') || pathname.startsWith('/api/atendente');
    if (isAtendenteRoute) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Não autenticado.', loginUrl: '/atendente/login' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/atendente/login', request.url));
    }
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

    // Staff Benavera acessando rotas de clínica → redireciona pro admin
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/novo-financiamento') ||
      pathname.startsWith('/financiamentos') ||
      pathname.startsWith('/pacientes') ||
      pathname.startsWith('/repasses') ||
      pathname.startsWith('/equipe') ||
      pathname.startsWith('/configuracoes')
    ) {
      if (BENAVERA_ALL_ROLES.has(role)) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }

    // Rota do atendente: só BENAVERA_COMERCIAL ou BENAVERA_ADMIN
    if (pathname.startsWith('/atendente') || pathname.startsWith('/api/atendente')) {
      if (role !== 'BENAVERA_COMERCIAL' && role !== 'BENAVERA_ADMIN') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/atendente/login', request.url));
      }
    }

    // Injeta headers de sessão para as Server Components e API Routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId || ''));
    requestHeaders.set('x-user-role', role);
    requestHeaders.set('x-clinic-id', String(payload.clinicId || ''));
    requestHeaders.set('x-user-name', String(payload.name || ''));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Token inválido ou expirado
    const isAtendenteRoute = pathname.startsWith('/atendente') || pathname.startsWith('/api/atendente');
    if (isAtendenteRoute) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Sessão expirada.', loginUrl: '/atendente/login' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/atendente/login', request.url));
      response.cookies.delete(JWT_COOKIE);
      return response;
    }
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

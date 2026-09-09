// src/middleware.ts
// Middleware de autenticação e roteamento unificado Benavera

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'benavera-secret-dev-2026-change-in-production'
);
const COOKIE_NAME = 'benavera_session';

// Rotas públicas que não precisam de autenticação
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/proposta',
  '/api/proposta',
  '/api/leads',
  '/api/health',
  '/conteudos',
  '/sobre',
  '/calculadoras',
  '/como-funciona',
  '/clinicas',
  '/simular',
  '/privacidade',
  '/termos',
  '/obrigado',
  '/obrigado-clinica',
  '/parcelamento-',
  '/financiamento-',
  '/solucoes-financeiras',
  '/_next',
  '/favicon',
  '/icon',
  '/apple-icon',
  '/robots',
  '/sitemap',
  '/manifest',
  '/llms',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rotas públicas e arquivos estáticos
  if (isPublicPath(pathname) || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Verificar token de sessão
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Se for chamada de API protegida, retornar 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    // Redirecionar páginas para login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Controle de acesso por rota:
    // Apenas BENAVERA_ADMIN e BENAVERA_ANALYST podem acessar /admin
    if (pathname.startsWith('/admin')) {
      if (role !== 'BENAVERA_ADMIN' && role !== 'BENAVERA_ANALYST') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Usuários Benavera redirecionam de /dashboard para /admin
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/financiamentos') || pathname.startsWith('/pacientes')) {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.ico).*)',
  ],
};

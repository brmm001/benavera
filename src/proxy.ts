import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/security';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercepta rotas administrativas e rotas da API admin
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    
    // Ignora rotas de autenticação da API (para permitir login/logout)
    if (pathname.startsWith('/api/admin/auth/')) {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get('benavera_admin_token')?.value;
    const isAuthenticated = await verifyAdminToken(adminToken);

    const isApiRoute = pathname.startsWith('/api/admin');

    // Se não estiver autenticado e tentar acessar área protegida
    if (!isAuthenticated) {
      if (pathname === '/admin/login') {
        // Permitir acesso à tela de login
        return NextResponse.next();
      }
      
      // Se for rota da API, retorna erro 401
      if (isApiRoute) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      
      // Se for página web, redireciona para login
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }

    // Se JÁ estiver autenticado e tentar acessar /admin/login ou /admin, redireciona para /admin/leads
    if (isAuthenticated && (pathname === '/admin/login' || pathname === '/admin' || pathname === '/admin/')) {
      const response = NextResponse.redirect(new URL('/admin/leads', request.url));
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return response;
    }

    // Passou em tudo, permite o acesso e previne indexação
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    
    if (!isApiRoute) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    }
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // O matcher pega qualquer rota em /admin e /api/admin
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

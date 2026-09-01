import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminPassword,
  getAdminSecretToken,
  timingSafeCompare,
  getClientIP,
} from '@/lib/security';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    // Rate limit: máximo 5 tentativas de login por IP a cada 10 minutos
    const rateLimit = checkRateLimit(`login_${clientIP}`, 5, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Muitas tentativas de login incorretas. Tente novamente mais tarde.',
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { password?: string };
    const providedPassword = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = getAdminPassword();

    if (!providedPassword || !timingSafeCompare(providedPassword, expectedPassword)) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas ou acesso não autorizado.' },
        { status: 401 }
      );
    }

    const secretToken = getAdminSecretToken();
    const response = NextResponse.json({
      success: true,
      message: 'Autenticado com sucesso.',
      redirectUrl: '/admin/leads',
    });

    // Cookie de sessão administrativa seguro e protegido
    response.cookies.set('benavera_admin_token', secretToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error('[Admin Login] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login.' },
      { status: 500 }
    );
  }
}

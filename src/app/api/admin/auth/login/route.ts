import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminPassword,
  signAdminToken,
  getClientIP,
} from '@/lib/security';

import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    const body = (await request.json()) as { password?: string };
    const providedPassword = typeof body.password === 'string' ? body.password : '';
    const expectedPassword = getAdminPassword();

    // Uma simples checagem de senha
    if (!providedPassword || providedPassword !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas ou acesso não autorizado.' },
        { status: 401 }
      );
    }

    const secretToken = await signAdminToken();
    
    // Utilizar cookies() do next/headers é a forma mais confiável no App Router
    const cookieStore = await cookies();
    cookieStore.set('benavera_admin_token', secretToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return NextResponse.json({
      success: true,
      message: 'Autenticado com sucesso.',
      redirectUrl: '/admin/leads',
    });
  } catch (error) {
    console.error('[Admin Login] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login.' },
      { status: 500 }
    );
  }
}

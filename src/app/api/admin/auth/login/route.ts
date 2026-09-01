import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string };
    const expectedPassword =
      process.env.ADMIN_PASSWORD ||
      process.env.ADMIN_SECRET ||
      'benavera2026';

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Senha incorreta.' },
        { status: 401 }
      );
    }

    const secretToken = process.env.ADMIN_SECRET || 'benavera-admin-secret-2026';
    const response = NextResponse.json({ success: true, message: 'Autenticado com sucesso.' });

    // Cookie de sessão administrativa seguro
    response.cookies.set('benavera_admin_token', secretToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao processar login.' },
      { status: 500 }
    );
  }
}

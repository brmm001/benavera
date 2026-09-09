// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser, AUTH_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const result = await loginUser(email, password);

    if (!result.success || !result.token || !result.user) {
      return NextResponse.json({ error: result.error || 'Credenciais inválidas.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    response.cookies.set(AUTH_COOKIE.name, result.token, AUTH_COOKIE.options);

    return response;
  } catch (err) {
    console.error('[Login API]', err);
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}

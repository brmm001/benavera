// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser, AUTH_COOKIE } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIP } from '@/lib/security';
import { COOKIE_NAME as BV_ADMIN_COOKIE } from '@/lib/auth-config';

function clearSessionCookies(response: NextResponse) {
  // Uma tentativa de login (com sucesso ou falha) SEMPRE descarta sessões anteriores,
  // evitando que um cookie antigo de outra conta continue válido no navegador.
  response.cookies.delete(AUTH_COOKIE.name);
  response.cookies.delete(BV_ADMIN_COOKIE);
  response.cookies.delete('benavera_clinic_session');
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return clearSessionCookies(NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 }));
    }

    // Proteção contra força bruta: por IP e por e-mail
    const ip = getClientIP(request);
    const byIp = checkRateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    const byEmail = checkRateLimit(`login:email:${email}`, 8, 15 * 60 * 1000);
    if (!byIp.allowed || !byEmail.allowed) {
      const wait = Math.max(byIp.resetInSeconds, byEmail.resetInSeconds);
      return clearSessionCookies(NextResponse.json(
        { error: `Muitas tentativas de login. Tente novamente em ${Math.ceil(wait / 60)} minuto(s).` },
        { status: 429 }
      ));
    }

    const result = await loginUser(email, password);

    if (!result.success || !result.token || !result.user) {
      return clearSessionCookies(NextResponse.json({ error: result.error || 'Credenciais inválidas.' }, { status: 401 }));
    }

    const response = clearSessionCookies(NextResponse.json({
      success: true,
      user: result.user,
    }));

    response.cookies.set(AUTH_COOKIE.name, result.token, AUTH_COOKIE.options);

    return response;
  } catch (err) {
    console.error('[Login API]', err);
    return clearSessionCookies(NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 }));
  }
}

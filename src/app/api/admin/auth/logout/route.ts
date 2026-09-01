import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
    redirectUrl: '/admin/login',
  });

  // Limpa o cookie de autenticação administrativa
  response.cookies.set('benavera_admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

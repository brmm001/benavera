import { NextResponse } from 'next/server';

import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  
  // Limpa o cookie de autenticação administrativa
  cookieStore.set('benavera_admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return NextResponse.json({
    success: true,
    message: 'Sessão encerrada com sucesso.',
    redirectUrl: '/admin/login',
  });
}

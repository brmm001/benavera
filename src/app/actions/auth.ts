'use server';

// No Next.js 16 (Turbopack), arquivos 'use server' só podem exportar funções async.
// Constantes e helpers ficam em @/lib/auth-config

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME, COOKIE_MAX_AGE, getAdminPassword, getAdminToken } from '@/lib/auth-config';

export async function login(
  _prevState: unknown,
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  const password = (formData.get('password') as string | null) ?? '';

  if (!password || password.trim() !== getAdminPassword().trim()) {
    return { error: 'Senha incorreta. Tente novamente.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, getAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  // Retorna sucesso — o cliente navega via window.location (reload completo)
  // para garantir que o cookie seja enviado no próximo request ao servidor.
  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/admin/login');
}

export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && token === getAdminToken();
}

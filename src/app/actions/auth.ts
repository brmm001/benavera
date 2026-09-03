'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE_NAME = 'bv_admin';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? 'Bvr@Admin#2026!';
}

export function getAdminToken(): string {
  return process.env.ADMIN_SECRET ?? 'bv-secure-token-9x2k7p4m8q1r';
}

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
    // Em produção Vercel o NODE_ENV é 'production', mas mesmo em HTTP local não deve bloquear
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  // Retorna sucesso — o cliente faz a navegação com window.location
  // para garantir que o cookie seja enviado no próximo request (reload completo)
  return { success: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/admin/login');
}

/** Verifica a sessão no servidor (Server Components) */
export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return !!token && token === getAdminToken();
}

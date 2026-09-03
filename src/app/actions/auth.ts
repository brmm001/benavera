'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'bv_admin';

function getExpectedPassword(): string {
  return process.env.ADMIN_PASSWORD || 'benavera2026';
}

function getExpectedToken(): string {
  return process.env.ADMIN_SECRET || 'bv-admin-secret-fallback-2026';
}

export async function login(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;
  const expectedPassword = getExpectedPassword();

  if (!password || password.trim() !== expectedPassword.trim()) {
    return { error: 'Senha incorreta ou acesso negado.' };
  }

  const token = getExpectedToken();

  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  redirect('/admin/leads');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/admin/login');
}

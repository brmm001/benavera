// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';
import { COOKIE_NAME as BV_ADMIN_COOKIE } from '@/lib/auth-config';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE.name);
  response.cookies.delete(BV_ADMIN_COOKIE);
  response.cookies.delete('benavera_clinic_session');
  return response;
}

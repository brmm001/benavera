import { NextResponse } from 'next/server';
import { PORTAL_COOKIE } from '@/lib/portal-auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(PORTAL_COOKIE);
  return response;
}

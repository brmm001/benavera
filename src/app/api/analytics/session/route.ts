import { NextRequest, NextResponse } from 'next/server';
import { buildTouch } from '@/lib/acquisition';
import { startVisit, validId } from '@/lib/acquisition-db';
import { isPublicPath } from '@/lib/seo';
import { checkRateLimit } from '@/lib/rateLimit';
import { getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const consent = request.cookies.get('bv_consent')?.value;
  if (!['analytics', 'all'].includes(consent || '')) return new NextResponse(null, { status: 204 });
  if (!checkRateLimit(`analytics:${getClientIP(request)}`, 120).allowed) return new NextResponse(null, { status: 429 });
  try {
    const text = await request.text();
    if (text.length > 4096) return new NextResponse(null, { status: 413 });
    const body = JSON.parse(text);
    if (typeof body.path !== 'string' || !isPublicPath(body.path)) return new NextResponse(null, { status: 400 });
    if (/bot|crawler|spider/i.test(request.headers.get('user-agent') || '')) return new NextResponse(null, { status: 204 });
    const previousVisitor = request.cookies.get('bv_vid')?.value;
    const previousSession = request.cookies.get('bv_sid')?.value;
    const visitor = validId(previousVisitor) ? previousVisitor! : crypto.randomUUID();
    const session = validId(previousSession) && validId(previousVisitor) ? previousSession! : crypto.randomUUID();
    await startVisit(visitor, session, buildTouch(body, consent === 'all'), !validId(previousSession));
    const response = NextResponse.json({ ok: true });
    const options = { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'lax' as const, path: '/' };
    response.cookies.set('bv_vid', visitor, { ...options, maxAge: 90 * 86400 });
    response.cookies.set('bv_sid', session, { ...options, maxAge: 1800 });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete('bv_sid'); response.cookies.delete('bv_vid');
  return response;
}

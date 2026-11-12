import { NextRequest, NextResponse } from 'next/server';
import { ANALYTICS_EVENTS, safePath, safeToken } from '@/lib/acquisition';
import { ensureAcquisitionSchema, validId } from '@/lib/acquisition-db';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  if (!['analytics','all'].includes(request.cookies.get('bv_consent')?.value || '')) return new NextResponse(null, { status: 204 });
  const sid = request.cookies.get('bv_sid')?.value;
  if (!validId(sid)) return new NextResponse(null, { status: 204 });
  if (!checkRateLimit(`event:${sid}`, 120).allowed) return new NextResponse(null, { status: 429 });
  try {
    const text = await request.text();
    if (text.length > 1024) return new NextResponse(null, { status: 413 });
    const body = JSON.parse(text);
    if (!ANALYTICS_EVENTS.has(body.event) || body.event === 'page_view') return new NextResponse(null, { status: 400 });
    const db = await ensureAcquisitionSchema();
    await db`INSERT INTO bv_web_events(session_id, event_name, page_path, target)
      SELECT id, ${body.event}, ${safePath(body.path)}, ${safeToken(body.target)} FROM bv_web_sessions
      WHERE id = ${sid}::uuid AND last_seen_at > NOW() - INTERVAL '30 minutes'`;
    return new NextResponse(null, { status: 204 });
  } catch { return new NextResponse(null, { status: 503 }); }
}

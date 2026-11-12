import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureAcquisitionSchema } from '@/lib/acquisition-db';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const session = await getSession();
  if (!session || !['BENAVERA_ADMIN','BENAVERA_ANALYST'].includes(session.role)) return new NextResponse(null, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 2000) return new NextResponse(null, { status: 413 });
    const body = JSON.parse(text);
    if (!['ChatGPT','Perplexity','Gemini','Copilot'].includes(body.engine) || typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 500 || typeof body.benavera !== 'boolean' || typeof body.capim !== 'boolean') return new NextResponse(null, { status: 400 });
    let source = '';
    if (body.sourceUrl) {
      const url = new URL(body.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.href.length > 400) return new NextResponse(null, { status: 400 });
      url.search = ''; url.hash = ''; source = url.href;
    }
    const db = await ensureAcquisitionSchema();
    await db`INSERT INTO bv_geo_observations(engine, prompt, benavera_mentioned, capim_mentioned, source_url) VALUES (${body.engine}, ${body.prompt.trim()}, ${body.benavera}, ${body.capim}, ${source})`;
    return NextResponse.json({ ok: true });
  } catch { return new NextResponse(null, { status: 400 }); }
}

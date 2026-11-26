// GET & POST /api/cron/subscriptions — Rotina diária de carência (7 dias) e suspensão por inadimplência
import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/secrets';
import { runSubscriptionLifecycleSweep } from '@/lib/billing-service';

function isAuthorized(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return Boolean(bearer && safeEqual(bearer, secret));
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try {
    const result = await runSubscriptionLifecycleSweep();
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[Cron Subscriptions]', err);
    return NextResponse.json({ error: 'Erro na rotina de assinaturas.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

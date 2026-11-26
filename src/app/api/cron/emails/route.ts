// GET & POST /api/cron/emails — Orquestrador automático de e-mails Benavera
// Diário: lembretes D-3/D0 de mensalidades, follow-ups atrasados, resumo executivo da diretoria
// Segundas-feiras: relatórios semanais (clínicas, representantes, comerciais)
// Dia 1º do mês: relatórios mensais (clínicas, representantes, comerciais)

import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/secrets';
import { runScheduledEmailCron } from '@/lib/email-reports';

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

  const sp = request.nextUrl.searchParams;
  const forceWeekly = sp.get('forceWeekly') === '1' || sp.get('forceWeekly') === 'true';
  const forceMonthly = sp.get('forceMonthly') === '1' || sp.get('forceMonthly') === 'true';

  try {
    const summary = await runScheduledEmailCron({ forceWeekly, forceMonthly });
    return NextResponse.json({ success: true, summary }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[Cron Emails]', err);
    return NextResponse.json({ error: 'Erro ao executar rotina de e-mails.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

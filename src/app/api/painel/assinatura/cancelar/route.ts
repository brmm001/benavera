// POST /api/painel/assinatura/cancelar — Cancela assinatura recorrente no Mercado Pago (verificado) mantendo acesso até o fim do ciclo pago
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelClinicSubscription } from '@/lib/billing-service';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN'].includes(session.role)) {
    return NextResponse.json(
      { error: 'Apenas administradores ou financeiro da clínica podem cancelar a assinatura.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 400) : null;

    const result = await cancelClinicSubscription({
      clinicId: session.clinicId,
      immediate: false,
      reason,
      cancelledBy: 'CLINIC',
      actorId: session.userId,
      actorName: session.name,
    });
    return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[API Assinatura Cancelar POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao cancelar assinatura.' },
      { status: 400 }
    );
  }
}

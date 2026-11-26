// POST /api/painel/assinatura/cancelar — Cancela renovação automática mantendo acesso até fim do ciclo pago
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { cancelClinicSubscription } from '@/lib/billing-service';

export async function POST() {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!['CLINIC_ADMIN', 'BENAVERA_ADMIN'].includes(session.role)) {
    return NextResponse.json({ error: 'Apenas o administrador da clínica pode cancelar a assinatura.' }, { status: 403 });
  }

  try {
    const result = await cancelClinicSubscription({
      clinicId: session.clinicId,
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

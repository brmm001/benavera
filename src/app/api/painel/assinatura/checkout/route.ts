// POST /api/painel/assinatura/checkout — Inicia pagamento via Mercado Pago (Cartão Recorrente, Pix ou Boleto)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { startClinicCheckout } from '@/lib/billing-service';

const checkoutSchema = z.object({
  planId: z.string().uuid('Plano inválido.'),
  cycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
  paymentMethod: z.enum(['CARD_RECURRING', 'PIX', 'BOLETO']),
  couponCode: z.string().max(50).optional().nullable(),
  payerEmail: z.string().email().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }
  if (!['CLINIC_ADMIN', 'CLINIC_FINANCIAL', 'BENAVERA_ADMIN'].includes(session.role)) {
    return NextResponse.json(
      { error: 'Apenas administradores ou financeiro da clínica podem contratar ou alterar o plano.' },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados de checkout inválidos.', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await startClinicCheckout({
      clinicId: session.clinicId,
      planId: parsed.data.planId,
      cycle: parsed.data.cycle,
      paymentMethod: parsed.data.paymentMethod,
      couponCode: parsed.data.couponCode,
      payerEmail: parsed.data.payerEmail || session.email,
      actorId: session.userId,
      actorName: session.name,
    });

    return NextResponse.json(
      { success: true, ...result },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Assinatura Checkout POST]', err);
    const message = err instanceof Error ? err.message : 'Erro ao gerar cobrança.';
    const status = message.includes('não configurado') ? 503 : 400;
    return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

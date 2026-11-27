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
  cardTokenId: z.string().min(8).max(160).optional().nullable(),
  payerName: z.string().max(120).optional().nullable(),
  payerDocument: z.string().max(24).optional().nullable(),
  payerAddress: z
    .object({
      zipCode: z.string().max(16).optional().nullable(),
      streetName: z.string().max(120).optional().nullable(),
      streetNumber: z.string().max(20).optional().nullable(),
      neighborhood: z.string().max(80).optional().nullable(),
      city: z.string().max(80).optional().nullable(),
      federalUnit: z.string().max(4).optional().nullable(),
    })
    .optional()
    .nullable(),
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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Defesa PCI-DSS: jamais aceitar número de cartão ou CVV em texto plano no backend
  if ('cardNumber' in body || 'cvv' in body || 'securityCode' in body) {
    return NextResponse.json(
      { error: 'Dados sensíveis de cartão devem ser tokenizados diretamente no Mercado Pago (cardTokenId).' },
      { status: 400 }
    );
  }

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
      cardTokenId: parsed.data.cardTokenId,
      payerName: parsed.data.payerName,
      payerDocument: parsed.data.payerDocument,
      payerAddress: parsed.data.payerAddress,
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

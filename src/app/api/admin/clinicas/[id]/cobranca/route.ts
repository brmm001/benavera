// GET & POST /api/admin/clinicas/[id]/cobranca — Gestão de cobranças e baixa manual por clínica
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { applyPaidInvoice, cancelClinicSubscription, startClinicCheckout } from '@/lib/billing-service';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    planId: z.string().uuid(),
    cycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
    paymentMethod: z.enum(['CARD_RECURRING', 'PIX', 'BOLETO']).default('PIX'),
    couponCode: z.string().max(50).optional().nullable(),
    sendEmail: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal('mark_paid'),
    invoiceId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('cancel'),
    immediate: z.boolean().optional().default(false),
    reason: z.string().max(400).optional().nullable(),
  }),
]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const { id } = await params;
  const invoices = await sql`
    SELECT id, amount, status, cycle, due_date, paid_at, payment_method, mp_payment_id, mp_status,
           checkout_url, pix_qr_code, period_start, period_end, discount_amount, coupon_code, created_at
    FROM saas_invoices
    WHERE clinic_id = ${id}::uuid
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return NextResponse.json({ success: true, invoices }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  const { id } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (parsed.data.action === 'generate') {
      const result = await startClinicCheckout({
        clinicId: id,
        planId: parsed.data.planId,
        cycle: parsed.data.cycle,
        paymentMethod: parsed.data.paymentMethod,
        couponCode: parsed.data.couponCode,
        allowHostedFallback: true,
        actorId: session.userId,
        actorName: session.name,
        sendInvoiceEmail: parsed.data.sendEmail,
      });
      return NextResponse.json({ success: true, ...result }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } else if (parsed.data.action === 'cancel') {
      const result = await cancelClinicSubscription({
        clinicId: id,
        immediate: parsed.data.immediate,
        reason: parsed.data.reason || null,
        cancelledBy: 'ADMIN',
        actorId: session.userId,
        actorName: session.name,
      });
      return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      // Verifica se a fatura pertence à clínica
      const check = await sql`SELECT id FROM saas_invoices WHERE id = ${parsed.data.invoiceId}::uuid AND clinic_id = ${id}::uuid LIMIT 1`;
      if (!check[0]) return NextResponse.json({ error: 'Fatura não encontrada nesta clínica.' }, { status: 404 });

      const result = await applyPaidInvoice({
        invoiceId: parsed.data.invoiceId,
        paymentMethod: 'MANUAL',
        actorName: `${session.name} (Baixa manual)`,
      });
      return NextResponse.json({ success: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
    }
  } catch (err) {
    console.error('[API Admin Clinica Cobranca POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao processar cobrança.' },
      { status: 400 }
    );
  }
}

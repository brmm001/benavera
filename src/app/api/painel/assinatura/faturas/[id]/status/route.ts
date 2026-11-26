// GET /api/painel/assinatura/faturas/[id]/status — Consulta status de fatura (e reconcilia Pix/MP sob demanda)
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { applyPaidInvoice } from '@/lib/billing-service';
import { getMpPayment, getMpPreapproval, isMercadoPagoConfigured } from '@/lib/mercadopago';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'ID de fatura inválido.' }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT id, clinic_id, status, mp_payment_id, mp_preapproval_id, mp_status, paid_at, amount, period_end
      FROM saas_invoices
      WHERE id = ${id}::uuid AND clinic_id = ${session.clinicId}::uuid
      LIMIT 1
    `;
    const inv = rows[0];
    if (!inv) {
      return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 });
    }

    // Reconciliação ativa com a API do Mercado Pago se ainda estiver pendente
    if (String(inv.status) === 'PENDING' && isMercadoPagoConfigured()) {
      try {
        if (inv.mp_payment_id) {
          const mp = await getMpPayment(String(inv.mp_payment_id));
          if (String(mp.status).toLowerCase() === 'approved') {
            await applyPaidInvoice({
              invoiceId: id,
              mpPaymentId: String(mp.id),
              paidAt: mp.date_approved ? new Date(mp.date_approved) : new Date(),
              rawPayload: mp,
            });
          }
        } else if (inv.mp_preapproval_id) {
          const pre = await getMpPreapproval(String(inv.mp_preapproval_id));
          if (String(pre.status).toLowerCase() === 'authorized') {
            await applyPaidInvoice({
              invoiceId: id,
              mpPreapprovalId: String(pre.id),
              paymentMethod: 'CARD_RECURRING',
              rawPayload: pre,
            });
          }
        }
      } catch (syncErr) {
        console.warn('[Invoice Status Reconcile]', syncErr);
      }
    }

    const freshRows = await sql`
      SELECT id, status, mp_status, paid_at, amount, period_end
      FROM saas_invoices
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    return NextResponse.json(
      { success: true, invoice: freshRows[0] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Invoice Status GET]', err);
    return NextResponse.json({ error: 'Erro ao consultar fatura.' }, { status: 500 });
  }
}

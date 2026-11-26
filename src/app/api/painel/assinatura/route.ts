// GET /api/painel/assinatura — Estado atual da assinatura, planos disponíveis e faturas da clínica
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { isMercadoPagoConfigured } from '@/lib/mercadopago';
import { GRACE_DAYS } from '@/lib/billing-service';

export async function GET() {
  const session = await getSession();
  if (!session || !session.clinicId) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const [subRows, plansRows, invoicesRows, clinicRows] = await Promise.all([
      sql`
        SELECT cs.*, sp.name AS plan_name, sp.slug AS plan_slug, sp.price_monthly, sp.price_annual, sp.is_free AS plan_is_free
        FROM clinic_subscriptions cs
        LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
        WHERE cs.clinic_id = ${session.clinicId}::uuid
        LIMIT 1
      `,
      sql`
        SELECT id, name, slug, description, price_monthly, price_annual, is_free, trial_days, max_users, module_ids
        FROM saas_plans
        WHERE archived = FALSE
        ORDER BY is_free DESC, price_monthly ASC, created_at ASC
      `,
      sql`
        SELECT id, amount, status, cycle, due_date, paid_at, payment_method, mp_status,
               checkout_url, pix_qr_code, pix_qr_code_base64, pix_expires_at,
               period_start, period_end, discount_amount, coupon_code, created_at
        FROM saas_invoices
        WHERE clinic_id = ${session.clinicId}::uuid
        ORDER BY created_at DESC
        LIMIT 30
      `,
      sql`SELECT id, nome_fantasia, email, email_financeiro FROM clinics WHERE id = ${session.clinicId}::uuid LIMIT 1`,
    ]);

    return NextResponse.json(
      {
        success: true,
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        graceDays: GRACE_DAYS,
        clinic: clinicRows[0] || null,
        subscription: subRows[0] || null,
        plans: plansRows,
        invoices: invoicesRows,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Painel Assinatura GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar dados da assinatura.' }, { status: 500 });
  }
}

// GET /api/admin/financeiro/mensalidades — Métricas reais de MRR, faturas e inadimplência
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { sql } from '@/lib/benavera-db';
import { isMercadoPagoConfigured } from '@/lib/mercadopago';

export async function GET() {
  const session = await getAdminSession();
  if (!session || !['BENAVERA_ADMIN', 'BENAVERA_FINANCEIRO'].includes(session.role)) {
    return NextResponse.json({ error: 'Acesso restrito.' }, { status: 403 });
  }

  try {
    const [subSummary, mrrRows, invSummary, recentInvoices] = await Promise.all([
      sql`
        SELECT status, COUNT(*)::int AS total
        FROM clinic_subscriptions
        GROUP BY status
      `,
      sql`
        SELECT COALESCE(SUM(
          CASE
            WHEN cs.is_exempt THEN 0
            WHEN cs.custom_price IS NOT NULL THEN
              CASE WHEN cs.billing_cycle = 'ANNUAL' THEN cs.custom_price / 12.0 ELSE cs.custom_price END
            WHEN cs.billing_cycle = 'ANNUAL' THEN COALESCE(sp.price_annual, 0) / 12.0
            ELSE COALESCE(sp.price_monthly, 0)
          END * (1 - LEAST(100, GREATEST(0, COALESCE(cs.discount_percent, 0))) / 100.0)
        ), 0) AS mrr
        FROM clinic_subscriptions cs
        LEFT JOIN saas_plans sp ON sp.id = cs.plan_id
        WHERE cs.status IN ('ACTIVE', 'GRACE') AND cs.is_exempt = FALSE
      `,
      sql`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'PAID' AND paid_at >= date_trunc('month', NOW())), 0) AS paid_month,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PAID'), 0) AS paid_total,
          COALESCE(SUM(amount) FILTER (WHERE status = 'PENDING'), 0) AS pending_total,
          COUNT(*) FILTER (WHERE status = 'PAID')::int AS paid_count,
          COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed_count
        FROM saas_invoices
      `,
      sql`
        SELECT i.id, i.clinic_id, c.nome_fantasia AS clinic_name, i.amount, i.status, i.cycle,
               i.payment_method, i.due_date, i.paid_at, i.mp_payment_id, i.mp_status, i.coupon_code, i.created_at
        FROM saas_invoices i
        JOIN clinics c ON c.id = i.clinic_id
        ORDER BY i.created_at DESC
        LIMIT 50
      `,
    ]);

    const statusCounts: Record<string, number> = {};
    for (const r of subSummary) statusCounts[String(r.status)] = Number(r.total || 0);
    const mrr = Math.round(Number(mrrRows[0]?.mrr || 0) * 100) / 100;
    const inv = invSummary[0] || {};

    return NextResponse.json(
      {
        success: true,
        mercadoPagoConfigured: isMercadoPagoConfigured(),
        mrr,
        arr: Math.round(mrr * 12 * 100) / 100,
        statusCounts,
        invoicesSummary: {
          paidMonth: Number(inv.paid_month || 0),
          paidTotal: Number(inv.paid_total || 0),
          pendingTotal: Number(inv.pending_total || 0),
          paidCount: Number(inv.paid_count || 0),
          pendingCount: Number(inv.pending_count || 0),
          failedCount: Number(inv.failed_count || 0),
        },
        recentInvoices,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API Admin Financeiro Mensalidades GET]', err);
    return NextResponse.json({ error: 'Erro ao carregar dados financeiros.' }, { status: 500 });
  }
}
